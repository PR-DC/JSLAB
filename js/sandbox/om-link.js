/**
 * @file JSLAB OpenModelicaLink submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const zmq = require('zeromq');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');
const { XMLParser } = require('fast-xml-parser');

/**
 * Class for JSLAB OpenModelicaLink.
 */
class PRDC_JSLAB_OPENMODELICA_LINK {
  
  /**
   * Initializes a new instance of the OpenModelicaLink.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }
    
  /**
   * Starts the interaction with an external executable by initializing the necessary environment and parameters.
   * Launches the executable with the appropriate command-line arguments for interaction via ZMQ.
   * Waits for a port file to be created to establish the ZMQ communication.
   * @param {string} exe - Path to the executable to be run, defaults to the OpenModelica compiler if not provided.
   */
  async start(exe) {
    var obj = this;
    this.exe = exe;
    
    this.pid = 0;
    this.active = false;
    this.requester = null;
    this.portfile = '';
    
    this.filename = '';
    this.modelname = '';
    this.xmlfile = '';
    this.resultfile = '';
    this.csvfile = '';
    this.mat_temp_dir = '';
    this.simulation_options = {};
    this.quantities_list = [];
    this.parameter_list = {};
    this.continuous_list = {};
    this.input_list = {};
    this.output_list = {};
    this.mapped_names = {};
    this.override_variables = {};
    this.sim_opt_override = {};
    this.input_flag = false;
    this.linear_options = {
      startTime: '0.0',
      stopTime: '1.0',
      numberOfIntervals: '500',
      stepSize: '0.002',
      tolerance: '1e-6'
    };
    this.linearfile = '';
    this.linear_flag = false;
    this.linear_modelname = '';
    this.linear_inputs = '';
    this.linear_outputs = '';
    this.linear_states = '';
    this.linear_quantity_list = [];

    const random_string = Math.random().toString(36).substring(7);
    let cmd, portfile;

    if(process.platform === 'win32') {
      exe = exe || path.join(process.env.OPENMODELICAHOME, 'bin', 'omc.exe');
      cmd = `START /b "" "${exe}" --interactive=zmq +z=jslab.${random_string}`;
      portfile = path.join(os.tmpdir(), `openmodelica.port.jslab.${random_string}`);
    } else {
      exe = exe || 'omc';
      cmd = `${exe} --interactive=zmq -z=jslab.${random_string} &`;
      portfile = path.join(os.tmpdir(), `openmodelica.${process.env.USER}.port.jslab.${random_string}`);
    }

    this.portfile = portfile;
    
    var [flag1, pids1] = isProgramRunning('omc.exe');
    var omc_process = exec(cmd);
    await waitMSeconds(200);
    var [flag2, pids2] = isProgramRunning('omc.exe');
    this.pid = pids2.filter(function(e) {
      return !pids1.includes(e)
    });
    
    while(true) {
      await waitMSeconds(10);
      if(fs.existsSync(this.portfile)) {
        const filedata = fs.readFileSync(this.portfile, 'utf-8');
        this.requester = new zmq.Request();
        this.requester.connect(filedata);
        this.active = true;
        break;
      }
    }
  }
  
  /**
   * Sends an expression to be evaluated by the external executable through the ZMQ connection and waits for the result.
   * Parses the response using a dedicated expression parser.
   * @param {string} expr - The expression to be evaluated.
   * @returns {Promise<any>} - A promise that resolves with the parsed result of the expression evaluation.
   * @throws {Error} - Throws an error if there is no active connection.
   */
  async sendExpression(expr) {
    if(this.active) {
      await this.requester.send(expr);
      const [result] = await this.requester.receive();
      return this.parseExpression(result.toString());
    } else {
      this.jsl.env.error("@sendExpression: "+language.string(201));
      return false;
    }
  }
  
  /**
   * Initializes and configures a Modelica system with the specified parameters and libraries.
   * Loads necessary files and prepares the environment for simulation.
   * @param {string} filename - The path to the Modelica file.
   * @param {string} modelname - The name of the Modelica model.
   * @param {string[]} [libraries=[]] - An array of library paths to load.
   * @param {string} [command_line_options=''] - Additional command-line options for the simulation.
   */
  async ModelicaSystem(filename, modelname, libraries = [], command_line_options = '') {
    if(!filename || !modelname) {
      this.jsl.env.error('@ModelicaSystem: '+language.string(203));
      return false;
    }

    if(command_line_options) {
      const cmd_exp = await this.sendExpression(`setcommand_line_options("${command_line_options}")`);
      if(cmd_exp === 'false') {
        this.jsl.env.error('@ModelicaSystem: '+ await this.sendExpression("getErrorString()"));
        return false;
      }
    }

    const filepath = path.normalize(filename).replace(/\\/g, '/');
    const load_file_msg = await this.sendExpression(`loadFile("${filepath}")`);
    if(load_file_msg === 'false') {
      this.jsl.env.error('@ModelicaSystem: '+ await this.sendExpression("getErrorString()"));
      return false;
    }

    for(const lib of libraries) {
      let libmsg;
      if(fs.existsSync(lib)) {
        libmsg = await this.sendExpression(`loadFile("${lib}")`);
      } else {
        libmsg = await this.sendExpression(`loadModel(${lib})`);
      }
      if(libmsg === 'false') {
        this.jsl.env.error('@ModelicaSystem: '+ await this.sendExpression("getErrorString()"));
        return false;
      }
    }

    this.filename = filename;
    this.modelname = modelname;
    this.mat_temp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'OpenModelicaLink-'));
    await this.sendExpression('cd("' + this.mat_temp_dir + '")');
    await this.BuildModelicaModel();
    return true;
  }
  
  /**
   * Builds the Modelica model by sending the appropriate build command and parsing the resulting XML file.
   */
  async BuildModelicaModel() {
    const build_model_result = await this.sendExpression(`buildModel(${this.modelname})`);
    if(!build_model_result) {
      this.jsl.env.error('@BuildModelicaModel: '+ await this.sendExpression("getErrorString()"));
      return false;
    }

    this.xmlfile = path.join(this.mat_temp_dir, build_model_result[1]);
    this.xmlparse();
    return true;
  }
  
  /**
   * Retrieves the working directory used for temporary files and simulations.
   * @returns {string} - The path to the working directory.
   */
  getWorkDirectory() {
    return this.mat_temp_dir;
  }

  /**
   * Parses the XML file generated by the Modelica compiler to extract simulation parameters and variables.
   */
  xmlparse() {
    if(fs.existsSync(this.xmlfile)) {
      const xml_data = fs.readFileSync(this.xmlfile, 'utf-8');
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const xDoc = parser.parse(xml_data);

      // default_experiment
      const default_experiment = xDoc.fmiModelDescription.DefaultExperiment;
      if(default_experiment) {
        this.simulation_options.startTime = default_experiment.startTime || '0.0';
        this.simulation_options.stopTime = default_experiment.stopTime || '1.0';
        this.simulation_options.stepSize = default_experiment.stepSize || '0.002';
        this.simulation_options.tolerance = default_experiment.tolerance || '1e-6';
        this.simulation_options.solver = default_experiment.solver || '';
      }

      // scalar_variables
      const scalar_variables = xDoc.fmiModelDescription.ModelVariables.ScalarVariable || [];
      const fields = ['name', 'isValueChangeable', 'description', 'variability', 'causality', 'alias', 'aliasVariable'];
      for(let k = 0; k < scalar_variables.length; k++) {
        const item = scalar_variables[k];
        let scalar = {};
        fields.forEach(field => {
          scalar[field] = item[field] || '';
        });

        if(item.Real) {
          scalar.value = item.Real.start || '';
        }

        this.processVariable(scalar);
      }
    } else {
      this.jsl.env.error('@xmlparse: '+language.string(204));
      return false;
    }
    return true;
  }
  
  /**
   * Processes a scalar variable from the XML file and categorizes it based on its properties.
   * @param {Object} scalar - The scalar variable to process.
   */
  processVariable(scalar) {
    const name = scalar.name;
    const value = scalar.value;

    if(!this.linear_flag) {
      if(scalar.variability === 'parameter') {
        this.parameter_list[name] = value;
      } else if(scalar.variability === 'continuous') {
        this.continuous_list[name] = value;
      } else if(scalar.causality === 'input') {
        this.input_list[name] = value;
      } else if(scalar.causality === 'output') {
        this.output_list[name] = value;
      }
    }

    if(this.linear_flag) {
      if(scalar.alias === 'alias') {
        if(name.startsWith('x')) {
          this.linear_states.push(name.slice(3, -1));
        } else if(name.startsWith('u')) {
          this.linear_inputs.push(name.slice(3, -1));
        } else if(name.startsWith('y')) {
          this.linear_outputs.push(name.slice(3, -1));
        }
      }
      this.linear_quantity_list.push(scalar);
    } else {
      this.quantities_list.push(scalar);
    }
  }
  
  /**
   * Retrieves a list of quantities based on the provided arguments.
   * @param {string[]} [args] - An array of quantity names to retrieve. If omitted, returns all quantities.
   * @returns {Object[]} - An array of quantity objects.
   */
  getQuantities(args) {
    if(args && args.length > 0) {
      const tmpresult = [];
      for(let n = 0; n < args.length; n++) {
        for(let q = 0; q < this.quantities_list.length; q++) {
          if(this.quantities_list[q].name === args[n]) {
            tmpresult.push(this.quantities_list[q]);
          }
        }
      }
      return tmpresult;
    } else {
      return this.quantities_list;
    }
  }
  
  /**
   * Retrieves a list of linearized quantities based on the provided arguments.
   * @param {string[]} [args] - An array of linear quantity names to retrieve. If omitted, returns all linear quantities.
   * @returns {Object[]} - An array of linear quantity objects.
   */
  getLinearQuantities(args) {
    if(args && args.length > 0) {
      const tmpresult = [];
      for(let n = 0; n < args.length; n++) {
        for(let q = 0; q < this.linear_quantity_list.length; q++) {
          if(this.linear_quantity_list[q].name === args[n]) {
            tmpresult.push(this.linear_quantity_list[q]);
          }
        }
      }
      return tmpresult;
    } else {
      return this.linear_quantity_list;
    }
  }
  
  /**
   * Retrieves simulation parameters based on the provided arguments.
   * @param {string|string[]} [args] - A single parameter name or an array of parameter names to retrieve. If omitted, returns all parameters.
   * @returns {Object|any} - An object containing the requested parameters or a single parameter value.
   */
  getParameters(args) {
    if(args && args.length > 0) {
      if(Array.isArray(args)) {
        const param = {};
        for(let n = 0; n < args.length; n++) {
          param[args[n]] = this.parameter_list[args[n]];
        }
        return param;
      } else {
        return this.parameter_list[args];
      }
    } else {
      return this.parameter_list;
    }
  }
  
  /**
   * Retrieves input variables based on the provided arguments.
   * @param {string|string[]} [args] - A single input name or an array of input names to retrieve. If omitted, returns all inputs.
   * @returns {Object|any} - An object containing the requested inputs or a single input value.
   */
  getInputs(args) {
    if(args && args.length > 0) {
      if(Array.isArray(args)) {
        const inputs = {};
        for(let n = 0; n < args.length; n++) {
          inputs[args[n]] = this.input_list[args[n]];
        }
        return inputs;
      } else {
        return this.input_list[args];
      }
    } else {
      return this.input_list;
    }
  }
  
  /**
   * Retrieves output variables based on the provided arguments.
   * @param {string|string[]} [args] - A single output name or an array of output names to retrieve. If omitted, returns all outputs.
   * @returns {Object|any} - An object containing the requested outputs or a single output value.
   */
  getOutputs(args) {
    if(args && args.length > 0) {
      if(Array.isArray(args)) {
        const outputs = {};
        for(let n = 0; n < args.length; n++) {
          outputs[args[n]] = this.output_list[args[n]];
        }
        return outputs;
      } else {
        return this.output_list[args];
      }
    } else {
      return this.output_list;
    }
  }
  
  /**
   * Retrieves continuous variables based on the provided arguments.
   * @param {string|string[]} [args] - A single continuous variable name or an array of names to retrieve. If omitted, returns all continuous variables.
   * @returns {Object|any} - An object containing the requested continuous variables or a single value.
   */
  getContinuous(args) {
    if(args && args.length > 0) {
      if(Array.isArray(args)) {
        const continuous = {};
        for(let n = 0; n < args.length; n++) {
          continuous[args[n]] = this.continuous_list[args[n]];
        }
        return continuous;
      } else {
        return this.continuous_list[args];
      }
    } else {
      return this.continuous_list;
    }
  }
  
  /**
   * Retrieves simulation options based on the provided arguments.
   * @param {string|string[]} [args] - A single simulation option name or an array of names to retrieve. If omitted, returns all simulation options.
   * @returns {Object|any} - An object containing the requested simulation options or a single option value.
   */
  getSimulationOptions(args) {
    if(args && args.length > 0) {
      if(Array.isArray(args)) {
        const simoptions = {};
        for(let n = 0; n < args.length; n++) {
          simoptions[args[n]] = this.simulation_options[args[n]];
        }
        return simoptions;
      } else {
        return this.simulation_options[args];
      }
    } else {
      return this.simulation_options;
    }
  }
  
  /**
   * Retrieves linearization options based on the provided arguments.
   * @param {string|string[]} [args] - A single linearization option name or an array of names to retrieve. If omitted, returns all linearization options.
   * @returns {Object|any} - An object containing the requested linearization options or a single option value.
   */
  getLinearizationOptions(args) {
    if(args && args.length > 0) {
      if(Array.isArray(args)) {
        const linoptions = {};
        for(let n = 0; n < args.length; n++) {
          linoptions[args[n]] = this.linear_options[args[n]];
        }
        return linoptions;
      } else {
        return this.linear_options[args];
      }
    } else {
      return this.linear_options;
    }
  }
  
  /**
   * Sets simulation parameters based on the provided arguments.
   * @param {string|string[]} args - A single parameter assignment (e.g., "param=5") or an array of assignments.
   */
  setParameters(args) {
    if(args && args.length > 0) {
      if(!Array.isArray(args)) {
        args = [args];
      }
      args.forEach(arg => {
        const val = arg.replace(/\s+/g, "");
        const [key, value] = val.split("=");
        if(key in this.parameter_list) {
          this.parameter_list[key] = value;
          this.override_variables[key] = value;
        } else {
          this.jsl.env.error('@setParameters: ' + key + language.string(209));
        }
      });
    }
  }
  
  /**
   * Sets simulation options based on the provided arguments.
   * @param {string|string[]} args - A single simulation option assignment (e.g., "stepSize=0.01") or an array of assignments.
   */
  setSimulationOptions(args) {
    if(args && args.length > 0) {
      if(!Array.isArray(args)) {
        args = [args];
      }
      args.forEach(arg => {
        const val = arg.replace(/\s+/g, "");
        const [key, value] = val.split("=");
        if(key in this.simulation_options) {
          this.simulation_options[key] = value;
          this.sim_opt_override[key] = value;
        } else {
          this.jsl.env.error('@setSimulationOptions: ' + key + language.string(210));
        }
      });
    }
  }
  
  /**
   * Sets linearization options based on the provided arguments.
   * @param {string|string[]} args - A single linearization option assignment or an array of assignments.
   */
  setLinearizationOptions(args) {
    if(args && args.length > 0) {
      if(!Array.isArray(args)) {
        args = [args];
      }
      args.forEach(arg => {
        const val = arg.replace(/\s+/g, "");
        const [key, value] = val.split("=");
        if(key in this.linear_options) {
          this.linear_options[key] = value;
        } else {
          this.jsl.env.error('@setLinearizationOptions: ' + key + language.string(211));
        }
      });
    }
  }
  
  /**
   * Sets input variables based on the provided arguments.
   * @param {string|string[]} args - A single input assignment (e.g., "input1=10") or an array of assignments.
   */
  setInputs(args) {
    if(args && args.length > 0) {
      if(!Array.isArray(args)) {
        args = [args];
      }
      args.forEach(arg => {
        const val = arg.replace(/\s+/g, "");
        const [key, value] = val.split("=");
        if(key in this.input_list) {
          this.input_list[key] = value;
          this.input_flag = true;
        } else {
          this.jsl.env.error('@setInputs: ' + key + language.string(212));
        }
      });
    }
  }
  
  /**
   * Creates a CSV file containing input data for the simulation.
   */
  createcsvData() {
    this.csvfile = path.join(this.mat_temp_dir, `${this.modelname}.csv`);
    const file_id = fs.openSync(this.csvfile, 'w');
    const fields = Object.keys(this.input_list);
    let header = `time,${fields.join(",")},end\n`;
    fs.writeSync(file_id, header);

    let time = [];
    let tmpcsvdata = {};

    fields.forEach(field => {
      let var_data = this.input_list[field] || "0";
      try {
        var_data = eval(var_data.replace(/\[|\]|\(|\)/g, match => {
          return match === '[' || match === ']' ? '{' : '{';
        }));
      } catch {
        var_data = [[0, 0]]; // Default to 0 if evaluation fails
      }
      tmpcsvdata[field] = var_data;

      if(var_data.length > 1) {
        var_data.forEach(entry => {
          time.push(entry[0]);
        });
      }
    });

    if(time.length === 0) {
      time = [parseFloat(this.simulation_options.startTime), parseFloat(this.simulation_options.stopTime)];
    }

    const sorted_time = time.sort((a, b) => a - b);
    let previous_value = {};

    sorted_time.forEach(t => {
      let line = `${t},`;
      fields.forEach((field) => {
        let data = tmpcsvdata[field];
        let value = previous_value[field] || 0;

        if(Array.isArray(data)) {
          for(let j = 0; j < data.length; j++) {
            if(data[j][0] === t) {
              value = data[j][1];
              data.splice(j, 1);
              tmpcsvdata[field] = data;
              break;
            }
          }
          previous_value[field] = value;
        }
        line += `${value},`;
      });
      line += "0\n";
      fs.writeSync(file_id, line);
    });

    fs.closeSync(file_id);
  }
  
  /**
   * Runs the simulation with optional result file and simulation flags.
   * @param {string} [resultfile=''] - The name of the result file to generate.
   * @param {string} [sim_flags=''] - Additional simulation flags.
   */
  async simulate(resultfile = '', sim_flags = '') {
    let r = resultfile ? ` -r=${resultfile}` : '';
    this.resultfile = resultfile ? path.join(this.mat_temp_dir, resultfile) : path.join(this.mat_temp_dir, `${this.modelname}_res.mat`);

    if(fs.existsSync(this.xmlfile)) {
      let getexefile;
      if(process.platform === 'win32') {
        getexefile = path.join(this.mat_temp_dir, `${this.modelname}.exe`);
      } else {
        getexefile = path.join(this.mat_temp_dir, this.modelname);
      }

      if(fs.existsSync(getexefile)) {
        let overridevar = '';
        if(Object.keys(this.override_variables).length || Object.keys(this.sim_opt_override).length) {
          const allOverrides = { ...this.override_variables, ...this.sim_opt_override };
          const fields = Object.keys(allOverrides);
          const tmpoverride1 = fields.map(field => `${field}=${allOverrides[field]}`);
          overridevar = ` -override=${tmpoverride1.join(',')}`;
        }

        let csvinput = '';
        if(this.input_flag) {
          this.createcsvData();
          csvinput = ` -csvInput=${this.csvfile}`;
        }

        const final_simulation_exe = `"${getexefile}"${overridevar}${csvinput}${r}${sim_flags}`;
        execSync(final_simulation_exe, { cwd: this.mat_temp_dir });
      } else {
        this.jsl.env.error('@simulate: '+language.string(205));
      }
    } else {
      this.jsl.env.error('@simulate: '+language.string(206));
    }
  }
  
  /**
   * Performs linearization of the model and retrieves the linear matrices.
   * @returns {Array<Object>} - An array containing the A, B, C, and D matrices.
   */
  async linearize() {
    const linres = await this.sendExpression("setcommand_line_options(\"+generateSymbolicLinearization\")");
    if(linres && linres[0] === "false") {
      this.jsl.env.error('@simulate: '+language.string(207)+ await this.sendExpression("getErrorString()"));
      return false;
    }

    const fields = Object.keys(this.override_variables);
    const tmpoverride1 = fields.map(field => `${field}=${this.override_variables[field]}`);
    const tmpoverride2 = tmpoverride1.length ? ` -override=${tmpoverride1.join(',')}` : "";

    const lin_fields = Object.keys(this.linear_options);
    const tmpoverride1lin = lin_fields.map(field => `${field}=${this.linear_options[field]}`);
    const overridelinear = tmpoverride1lin.join(',');

    let csvinput = '';
    if(this.input_flag) {
      this.createcsvData();
      csvinput = `-csvInput=${this.csvfile.replace(/\\/g, '/')}`;
    }

    const linexpr = `linearize(${this.modelname},${overridelinear},sim_flags="${csvinput}  ${tmpoverride2}")`;
    const res = await this.sendExpression(linexpr);
    this.resultfile = res.resultFile;
    this.linear_modelname = `linear_${this.modelname}`;
    this.linearfile = path.join(this.mat_temp_dir, `${this.linear_modelname}.mo`).replace(/\\/g, '/');
    if(fs.existsSync(this.linearfile)) {
      const loadmsg = await this.sendExpression(`loadFile("${this.linearfile}")`);
      if(loadmsg && loadmsg[0] === "false") {
        this.jsl.env.error('@linearize: '+ await this.sendExpression("getErrorString()"));
        return false;
      }

      const cNames = await this.sendExpression("getClassNames()");
      const buildmodelexpr = `buildModel(${cNames[0]})`;
      const buildModelmsg = await this.sendExpression(buildmodelexpr);
      if(buildModelmsg && buildModelmsg.length > 0) {
        this.linear_flag = true;
        this.xmlfile = path.join(this.mat_temp_dir, buildModelmsg[1]);
        this.linear_quantity_list = [];
        await this.xmlparse();
        return this.getLinearMatrix();
      } else {
        this.jsl.env.error('@linearize: '+ await this.sendExpression("getErrorString()"));
        return false;
      }
    }
    return true;
  }
  
  /**
   * Retrieves the linear A, B, C, and D matrices.
   * @returns {Array<Object>} - An array containing the A, B, C, and D matrices.
   */
  getLinearMatrix() {
    const matrix_A = {};
    const matrix_B = {};
    const matrix_C = {};
    const matrix_D = {};

    this.linear_quantity_list.forEach(item => {
      const name = item.name;
      const value = item.value;

      if(item.variability === "parameter") {
        if(name.startsWith('A')) {
          matrix_A[name] = value;
        } else if(name.startsWith('B')) {
          matrix_B[name] = value;
        } else if(name.startsWith('C')) {
          matrix_C[name] = value;
        } else if(name.startsWith('D')) {
          matrix_D[name] = value;
        }
      }
    });

    return [matrix_A, matrix_B, matrix_C, matrix_D];
  }
  
  /**
   * Converts linear matrix data into a two-dimensional array format.
   * @param {Object} matrix_name - The linear matrix object to convert.
   * @returns {number[][]|number} - The converted matrix as a 2D array or 0 if empty.
   */
  getLinearMatrixValues(matrix_name) {
    if(Object.keys(matrix_name).length > 0) {
      const fields = Object.keys(matrix_name);
      const last_field = fields[fields.length - 1];
      const rows = parseInt(last_field.charAt(2), 10);
      const columns = parseInt(last_field.charAt(4), 10);
      const tmp_matrix = Array.from({ length: rows }, () => Array(columns).fill(0));

      fields.forEach(field => {
        const r = parseInt(field.charAt(2), 10) - 1;
        const c = parseInt(field.charAt(4), 10) - 1;
        const val = parseFloat(matrix_name[field]);
        tmp_matrix[r][c] = val;
      });

      return tmp_matrix;
    } else {
      return 0;
    }
  }
  
  /**
   * Retrieves the linear input variables.
   * @returns {string|boolean} - The linear input variables or false if the model is not linearized.
   */
  getlinear_inputs() {
    if(this.linear_flag) {
      return this.linear_inputs;
    } else {
      this.jsl.env.error("@getlinear_inputs: "+language.string(202));
      return false;
    }
  }
  
  /**
   * Retrieves the linear output variables.
   * @returns {string|boolean} - The linear output variables or false if the model is not linearized.
   */
  getlinear_outputs() {
    if(this.linear_flag) {
      return this.linear_outputs;
    } else {
      this.jsl.env.error("@getlinear_outputs: "+language.string(202));
      return false;
    }
  }
  
  /**
   * Retrieves the linear state variables.
   * @returns {string|boolean} - The linear state variables or false if the model is not linearized.
   */
  getlinear_states() {
    if(this.linear_flag) {
      return this.linear_states;
    } else {
      this.jsl.env.error("@getlinear_states: "+language.string(202));
      return false;
    }
  }
  
  /**
   * Retrieves simulation solutions based on the provided arguments and result file.
   * @param {string|string[]} [args] - A single variable name or an array of names to retrieve solutions for. If omitted, retrieves all variables.
   * @param {string} [resultfile=this.resultfile] - The path to the result file.
   * @returns {Promise<any>} - A promise that resolves with the simulation results or an error message.
   */
  async getSolutions(args, resultfile = this.resultfile) {
    resultfile = resultfile.replace(/\\/g, '/');
    if(fs.existsSync(resultfile)) {
      if(args && args.length > 0) {
        const variables = `{${args.join(',')}}`;
        const simresult = await this.sendExpression(`readSimulationResult("${resultfile}", ${variables})`);
        await this.sendExpression("closeSimulationResultFile()");
        return simresult;
      } else {
        const variables = await this.sendExpression(`readSimulationResultVars("${resultfile}")`);
        await this.sendExpression("closeSimulationResultFile()");
        return variables;
      }
    } else {
      this.jsl.env.error('@getSolutions: ' + language.string(208) + resultfile);
      return false;
    }
  }
  
  /**
   * Creates valid variable names by replacing invalid characters and categorizes them based on the structure name.
   * @param {string} name - The original variable name.
   * @param {any} value - The value of the variable.
   * @param {string} structname - The structure name (e.g., 'continuous', 'parameter').
   */
  createValidNames(name, value, structname) {
    const tmpname = name.replace(/[^a-zA-Z0-9]/g, '_'); // Replace invalid characters with underscore
    this.mapped_names[tmpname] = name;

    if(structname === 'continuous') {
      this.continuous_list[tmpname] = value;
    } else if(structname === 'parameter') {
      this.parameter_list[tmpname] = value;
    } else if(structname === 'input') {
      this.input_list[tmpname] = value;
    } else if(structname === 'output') {
      this.output_list[tmpname] = value;
    }
  }
  
  /**
   * Parses a given expression string into structured data based on predefined formats.
   * Handles various formats including single and nested lists, records, and single elements.
   * @param {string} args - The expression string to parse.
   * @returns {Array|Object|string} - The parsed data which could be an array, an object, or a string.
   */
  parseExpression(args) {
    // Use regular expressions to match strings and key parts of the expression
    const final = args.match(/"(.*?)"|[{}()=]|-?\d+(\.\d+)?([eE][+-]?\d+)?|[a-zA-Z_][a-zA-Z0-9_.]*/g);
    
    if(final.length > 1) {
      if(final[0] === "{" && final[1] !== "{") {
        // Handle single-level list
        let buff = [];
        for(let i = 0; i < final.length; i++) {
          if(!["{", "}", ")", "(", ","].includes(final[i])) {
            const value = final[i].replace(/"/g, "");
            buff.push(value);
          }
        }
        return buff;

      } else if(final[0] === "{" && final[1] === "{") {
        // Handle nested lists
        let buff = [];
        let tmp = [];
        for(let i = 1; i < final.length - 1; i++) {
          if(final[i] === "{") {
            tmp = [];
          } else if(final[i] === "}") {
            buff.push(tmp);
            tmp = [];
          } else {
            tmp.push(final[i].replace(/"/g, ""));
          }
        }
        return buff;

      } else if(final[0] === "record") {
        // Handle record structure
        let result = {};
        for(let i = 2; i < final.length - 2; i++) {
          if(final[i] === "=") {
            const key = final[i - 1];
            const value = final[i + 1].replace(/"/g, "");
            result[key] = value;
          }
        }
        return result;

      } else if(final[0] === "fail") {
        // Handle failure case
        return this.sendExpression("getErrorString()");
      } else {
        // Return as a simple string if no special cases match
        return args.replace(/"/g, "");
      }
    } else if(final.length === 1) {
      // Handle single element case
      return final[0].replace(/"/g, "");
    } else {
      // Handle empty result
      return args.replace(/"/g, "");
    }
  }

  /**
   * Closes the current session safely by cleaning up resources such as temporary files and network connections.
   * Terminates any active processes and removes temporary port files.
   */
  async close() {
    if(this.portfile && fs.existsSync(this.portfile)) {
      fs.unlinkSync(this.portfile);
    }

    if(this.active) {
      await this.requester.close();
      this.active = false;
    }
    
    killProcess(this.pid);
  }
}

exports.PRDC_JSLAB_OPENMODELICA_LINK = PRDC_JSLAB_OPENMODELICA_LINK;