/**
 * @file JSLAB library parallel submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
 /**
 * Class for JSLAB parallel submodule.
 */
class PRDC_JSLAB_PARALLEL {

  /**
   * Constructs parallel submodule object with access to JSLAB's parallel functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
    this.worker_pool = [];
    this.task_queue = [];
    this.is_initialized = false;
  }
  
  /**
   * Retrieves the number of logical processors available.
   * @returns {number} Number of processors.
   */
  getProcessorsNum() {
    return this.jsl.env.processors_number || 4;
  }
  
  /**
   * Generates the worker's internal script.
   * @returns {string} The worker script as a string.
   */
  workerFunction() {
    return `
      self.addEventListener("message", async function(e) {
        if(e.data.type === 'execute') {
          try {
            const { setup_fun_str, work_fun_str, args, context } = e.data;

            // Assign context variables
            Object.assign(self, context);

            // Reconstruct and execute the setup function if provided
            if(setup_fun_str) {
              const setup_function = new Function('return ' + setup_fun_str);
              await setup_function();
            }

            // Reconstruct the work function
            const work_function = new Function('return ' + work_fun_str)();

            // Execute the work function with provided arguments
            const result = await work_function(...args);

            // Send back the result
            self.postMessage({ type: 'result', result });
          } catch(error) {
            self.postMessage({ type: 'error', error: error });
          }
        }
      });
      
      self.postMessage({ type: 'ready' });
    `;
  }

  /**
   * Initializes the worker pool with the specified number of workers.
   * @param {number} num_workers - Number of workers to initialize.
   */
  init(num_workers) {
    if(this.is_initialized) return;

    if(!num_workers || num_workers <= 0) {
      num_workers = this.getProcessorsNum();
    }

    const worker_script = `
      ${this.jsl.getWorkerInit()}
      ${this.workerFunction()}
    `;

    const blob = new Blob([worker_script], { type: 'application/javascript' });
    const blobURL = URL.createObjectURL(blob);

    for(let i = 0; i < num_workers; i++) {
      const worker = new Worker(blobURL);
      worker.busy = false;
      worker.ready = false;
      this.worker_pool.push(worker);
    }

    this.is_initialized = true;
  }

  /**
   * Assigns tasks from the queue to available workers.
   */
  assignTasksToWorkers() {
    for(const worker of this.worker_pool) {
      if(!worker.busy && this.task_queue.length > 0) {
        const task = this.task_queue.shift();
        worker.busy = true;
        
        function executeTask() {
          worker.postMessage({
            type: 'execute',
            setup_fun_str: task.setup_function_str,
            work_fun_str: task.work_function_str,
            args: task.args,
            context: task.context,
          });
        }
        
        worker.onmessage = (e) => {
          if(e.data.type === 'ready') {
            worker.ready = true;
            executeTask();
          } else if(e.data.type === 'result') {
            task.resolve(e.data.result);
          } else if(e.data.type === 'error') {
            task.reject(new Error(e.data.error));
          }
          worker.busy = false;
          this.assignTasksToWorkers();
        };

        worker.onerror = (e) => {
          task.reject(new Error(e.message));
          worker.busy = false;
          this.assignTasksToWorkers();
        };
        
        if(worker.ready) {
          executeTask();
        }
      }
    }
  }

  /**
   * Enqueues a task to be executed by the worker pool.
   * @param {Object} context - Context variables to assign in the worker.
   * @param {Function|String} [setup_function] - Optional setup function to execute before work_function.
   * @param {Array} args - Arguments to pass to the work_function.
   * @param {Function|String} work_function_str - The work function to execute.
   * @returns {Promise} - Resolves with the result of the work_function.
   */
  run(context = {}, setup_function = null, args = [], work_function) {
    if(!this.is_initialized) {
      this.init(0);
    }
    var setup_function_str = setup_function;
    if(typeof setup_function_str !== 'string') {
      setup_function_str = this.jsl.eval.rewriteCode(this.jsl.eval.getFunctionBody(setup_function)).code;
    }
    var work_function_str = work_function;
    if(typeof work_function_str !== 'string') {
      work_function_str = work_function.toString();
    }
    
    return new Promise((resolve, reject) => {
      this.task_queue.push({
        work_function_str,
        args,
        context,
        setup_function_str,
        resolve,
        reject,
      });

      this.assignTasksToWorkers();
    });
  }

  /**
   * Executes a parallel for loop by dividing the iteration range among workers.
   *
   * @param {number} start - The initial value of the loop counter.
   * @param {number} end - The terminating value of the loop counter.
   * @param {number} [step=1] - The amount by which to increment the loop counter each iteration.
   * @param {number} [num_workers=this.getProcessorsNum()] - The number of workers to use.
   * @param {Object} [context={}] - Optional context to pass to the work_function.
   * @param {Function} [setup_function=null] - Optional setup function to execute before work_function.
   * @param {Function} work_function - The function to execute on each iteration.
   * @returns {Promise<Array>} - A promise that resolves to an array of results.
   */
  async parfor(start, end, step = 1, num_workers, context, 
      setup_function, work_function) {
    if(!this.is_initialized) {
      this.init(num_workers);
    }

    if(step === 0) {
      this.jsl.env.error('@parfor: '+language.string(197));
    }

    const isAscending = (end - start) * step > 0;

    if(!isAscending) {
      this.jsl.env.error('@parfor: '+language.string(198));
    }
    
    const total_items = Math.ceil(Math.abs((end - start) / step)) + 1;
    const chunk_size = Math.ceil(total_items / num_workers);
    const tasks = [];

    const task_function = async function(chunk_start, chunk_end, step, work_fun_str) {
      const work_function = new Function('return ' + work_fun_str)();
      const results = [];
      for(let i = chunk_start; i <= chunk_end; i += step) {
        const result = await work_function(i);
        results.push(result);
      }
      return results;
    };
    
    var setup_function_str = this.jsl.eval.rewriteCode(this.jsl.eval.getFunctionBody(setup_function)).code;
    var task_function_str = task_function.toString();
    
    for(let worker_index = 0; worker_index < num_workers; worker_index++) {
      const chunk_start_index = worker_index * chunk_size;
      const chunk_end_index = Math.min(chunk_start_index + chunk_size, total_items);

      if(chunk_start_index >= chunk_end_index) {
        break;
      }

      const chunk_start = start + chunk_start_index * step;
      let chunk_end = start + (chunk_end_index * step) - step;

      if(chunk_end > end) {
        chunk_end = end;
      }

      const task = this.run(
        context,
        setup_function_str,   
        [chunk_start, chunk_end, step, work_function.toString()],
        task_function_str
      );

      tasks.push(task);
    }

    const nested_results = await Promise.all(tasks);
    return nested_results.flat();
  }

  /**
   * Terminates all workers and resets the worker pool.
   */
  terminate() {
    for(const worker of this.worker_pool) {
      worker.terminate();
    }
    this.worker_pool = [];
    this.task_queue = [];
    this.is_initialized = false;
  }
}

exports.PRDC_JSLAB_PARALLEL = PRDC_JSLAB_PARALLEL;