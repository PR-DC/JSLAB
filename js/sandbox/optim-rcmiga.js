/**
 * @file JSLAB library optim Real Coded Mixed Integer Genetic Algorithm submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
/**
 * Class for Real Coded Mixed Integer Genetic Algorithm - RCMIGA.
 */
class PRDC_JSLAB_OPTIM_RCMIGA {

  /**
   * Creates an instance of PRDC_JSLAB_LIB_OPTIM_RCMIGA.
   * @param {Object} problem - The optimization problem definition.
   * @param {Object} opts - Configuration options for the algorithm.
   */
  constructor(problem, opts) {
    this.flag = 'preinit';
    this.problem = problem;
    this.opts = opts;
    this.state = {};
    this.selection = {};
    this.solution = {};
    this.constrained = problem.constrained;
    this.stoped = 0;

    this.checkInputs();
    if(this.bounded) {
      this.opts.lbm = repCol(this.opts.lb, opts.PopulationSize);
      this.opts.ubm = repCol(this.opts.ub, opts.PopulationSize);
    }
    
    this.opts.a = opts.a ?? 0;
    this.opts.b_real = opts.b_real ?? 0.15;
    this.opts.b_integer = opts.b_integer ?? 0.35;
    this.opts.p_real = opts.p_real ?? 10;
    this.opts.p_integer = opts.p_integer ?? 4;
    this.opts.UseVectorized = opts.UseVectorized ?? false;
    this.opts.UseParallel = opts.UseParallel ?? false;
    this.opts.Display = opts.Display ?? 'iter';
    
    // Inicijalizacija
    this.flag = 'init';
    this.outputFcn();
    this.state.StartTime = tic;
    this.state.StallTime = tic;
    this.state.StallGenerations = 1;
    this.state.RandSeed = 'rcmiga';
    this.state.Generation = 0;
      
    this.rand = seedRandom(this.state.RandSeed);
  }

  /**
   * Executes the optimization process.
   */
  async run(parallel_context, parallel_setup_fun) {
    if(this.opts.UseParallel) {
      this.parallel_context = parallel_context;
      this.parallel_setup_fun = parallel_setup_fun;
      parallel.terminate();
    }
    
    this.initState();
    this.initPopulation();
    await this.updateState();
    
    this.flag = 'iter';
    this.outputFcn();
    this.createPlotFcn();
    this.plotFcn();
    
    // Optimizacija
    var nvars = this.problem.nvars;
    var newPopulation = zeros(nvars * this.opts.PopulationSize);
    var stop = 0;
    while(!stop) { // Petlja za optimizaciju
      // Merenje vremena
      this.state.GenTime = tic;
      
      // Elitizam
      if(this.state.ReproductionCount.elite > 0) {
        var [S, I] = sorti(this.state.FunVal);
        this.selection.current_elite = getSub(I, this.selection.elite);
        setSub(newPopulation, index(range(0, nvars - 1), 
          this.selection.elite, nvars), getSub(this.state.Population, 
          index(range(0, nvars - 1), this.selection.current_elite, nvars)));      
      }
      
      //  Selekcija
      this.state.parents = this.selectionFcn();

      // Ukrstanje
      setSub(newPopulation, index(range(0, nvars - 1), 
        this.selection.children, nvars), this.crossoverFcn());
      
      // Mutacija
      setSub(newPopulation, index(range(0, nvars - 1), 
        this.selection.mutants, nvars), this.mutationFcn());
      
      // Provera granica
      this.state.Population = [...newPopulation];
      this.integerRestriction();
      if(this.bounded) {
        this.checkBounds();
      }
      
      // Odredjivanje vrednosti funkcije prilagodjenosti i ogranicenja
      this.state.Generation = this.state.Generation + 1;
      await this.updateState();

      // Prikaz stanja
      stop = this.stoppingCriteria(); // Kriterijumi zaustavljanja
      this.outputFcn();
      this.plotFcn();
      await waitMSeconds(5);
    }
    
    this.solution.generations = this.state.Generation;
    var [x_min, I] = mini(this.state.FunVal);
    this.solution.feasible = 1;
    if(this.constrained && this.state.ConSumVal[I] > 0) {
      this.solution.feasible = 0;
    }
    this.solution.x = getSub(this.state.Population, 
      index(range(0, nvars - 1), I, nvars));
    this.solution.fval = this.problem.fitnessfcn(this.solution.x);
    this.solution.StoppingCriteria = stop;
    
    this.flag = 'done';
    this.outputFcn();
  }
  
  /**
   * Validates the input parameters and options.
   */
  checkInputs() {
    if(typeof this.problem.nonlconfcn === 'function') {
      this.constrained = 1;
    }
    if(typeof this.problem.IntCon === 'undefined') {
      this.problem.IntCon = [];
    }
    
    this.bounded = true;
    if(typeof this.opts.lb === 'undefined' || typeof this.opts.ub === 'undefined') {
      this.bounded = false;
      if(typeof this.opts.InitalUnboundedRange === 'undefined') {
        this.opts.InitalUnboundedRange = createFilledArray(this.problem.nvars, [0, 1]);
      }
    } else if((this.problem.lb && this.problem.lb.length != this.problem.nvars) || 
        (this.problem.ub && this.problem.ub.length != this.problem.nvars)) {
      throw new Error('Problem bounds have invalid dimension!');
    }

    if(this.opts.UseVectorized) {
      if(this.opts.UseParallel == true){
        disp('Option UseParallel is ignored while option UseVectorized is true.');
      } else if(this.opts.UseParallel != false){
        disp('Option UseParallel must be true or false.');
      }
    } else {
      if(![true, false].includes(this.opts.UseParallel)) {
        throw new Error('Option UseParallel must be true or false!');
      }
    }
  }
  
  /**
   * Creates the initial population.
   */
  creationFcn() {
    return this.creationMixedUniform();
  }
    
  /**
   * Selects individuals from the population.
   */
  selectionFcn() {
    return this.binaryTournamentSelection();
  }
    
  /**
   * Performs crossover between selected parents.
   */
  crossoverFcn() {
    return this.laplaceMixedCrossover();
  }
    
  /**
   * Mutates individuals in the population.
   */
  mutationFcn() {
    return this.powerMixedMutation();
  }

  /**
   * Initializes the plotting function.
   */
  createPlotFcn() {
    
  }
  
  /**
   * Updates the graphical plot with current optimization status.
   */
  plotFcn() {
    this.displayPlot();
  }

  /**
   * Renders the optimization plot.
   */
  displayPlot() {

  }

  /**
   * Handles button events to stop the optimization process.
   */
  buttonCallback() {
    this.stoped = 1;
  } 
    
  /**
   * Manages the output display based on configuration.
   */
  outputFcn() {
    if(['iter', 'final'].includes(this.opts.Display)) {
      this.displayOutput();
    }
  }
  
  /**
   * Displays the current state of optimization.
   */
  displayOutput() {
    if(this.opts.Display === 'iter') {
      switch(this.flag) {
        case 'init':
          disp(' Optimization is initialized!');
          if(this.opts.UseVectorized) {
            disp(' Vectorized functions evaluation in use.');
          } else if(this.opts.UseParallel){
            disp(' Parallel functions evaluation in use.');
          }
          break;
        case 'iter':
          if(this.state.Generation === 0 || this.state.Generation % 20 === 0) {
            if(this.constrained) {
              dispMonospaced('\n                        Best        Max           Stall');
              dispMonospaced('   Generation           f(x)     Constraint    Generations');
            } else {
              dispMonospaced('\n                        Best       Stall');
              dispMonospaced('   Generation           f(x)    Generations');
            }
          }

          let fval_s = num2str(this.state.Best[this.state.Generation], 5);
          if(this.constrained) {
            if(!this.state.Feasible[this.state.Generation]) {
              fval_s += '*';
            }
            dispMonospaced(
              `   ${num2str(this.state.Generation, 0).padStart(10)}   ${
              fval_s.padStart(12)}   ${
              num2str(max(this.state.ConSumVal), 2).padStart(12)}   ${
              num2str(this.state.StallGenerations, 0).padStart(12)}`
            );
          } else {
            dispMonospaced(
              `   ${num2str(this.state.Generation, 0).padStart(10)}   ${
              fval_s.padStart(12)}   ${
              num2str(this.state.StallGenerations, 0).padStart(12)}`
            );
          }
          break;
        case 'done':
          var str = '\nOptimization is done';
          if(this.constrained) {
            if(this.state.Feasible[this.state.Generation]) {
              str += ', solution found';
            } else {
              str += ', no feasible solution found';
            }
          }
          disp(` ${str}, stopping criteria = ${this.solution.StoppingCriteria}!\n`);
          break;
      }
    } else if(this.opts.Display === 'final') {
      if(this.flag === 'done') {
        var str = '\nOptimization is done';
        if(this.constrained) {
          if(this.state.Feasible[this.state.Generation]) {
            str += ', solution found';
          } else {
            str += ', no feasible solution found';
          }
        }
        disp(` ${str}, stopping criteria = ${this.solution.StoppingCriteria}!\n`);
      }
    }
  }
  
  /**
   * Creates the initial population with mixed uniform distribution.
   */
  creationMixedUniform() {
    var lb = this.opts.lb;
    var ub = this.opts.ub;
    if(!this.bounded) {
      lb = this.opts.InitalUnboundedRange.map((v) => v[0]);
      ub = this.opts.InitalUnboundedRange.map((v) => v[1]);
    }
    var N = this.problem.IntCon.length;
    var population = arrayRand(lb, ub, 
      this.problem.nvars, this.opts.PopulationSize, this.rand);
    if(N) {
      var r = arrayRandi([0, 1], N, this.opts.PopulationSize, this.rand);
      var I = index(this.problem.IntCon, 
        range(0, this.opts.PopulationSize - 1), this.problem.nvars);
      
      setSub(population, I, plus(fix(getSub(population, I)), r));
    }
    return population;
  }
  
  /**
   * Performs binary tournament selection of parents.
   */
  binaryTournamentSelection() {
    var parents = zeros(this.state.nParents);
    var r1 = arrayRandi([0, this.opts.PopulationSize-1], 2, 
      this.state.nParents, this.rand);
    var r2 = arrayRandi([0, this.opts.PopulationSize-1], 2, 
      this.state.nParents, this.rand);
    var neq = elementWise((a, b) => a > b, r1, r2);
    var I1 = indexOfAll(neq, true); // closer r2
    var I2 = indexOfAll(neq, false); // closer r1
    setSub(parents, I1, getSub(r2, I1));
    setSub(parents, I2, getSub(r1, I2));
    return parents;
  }
  
  /**
   * Executes Laplace mixed crossover to generate offspring.
   */
  laplaceMixedCrossover() {
    var N = this.problem.IntCon.length;
    var nvars = this.problem.nvars;
    var iParents = this.state.parents;
    var nChildren = this.state.ReproductionCount.children;
    var nParents = this.state.parentsCount.crossover;
    var sParents = this.state.parentsSelection.crossover;
    
    var b = scale(ones(nvars * nChildren/2), this.opts.b_real);
    if(N) {
      setSub(b, index(this.problem.IntCon, range(0, nChildren/2 - 1), nvars), 
        scale(ones(N * nChildren/2), this.opts.b_integer));
    }
    var u = arrayRand(zeros(nvars), ones(nvars), nvars, nChildren/2, this.rand);
    var r = arrayRand(zeros(nvars), ones(nvars), nvars, nChildren/2, this.rand);
    var beta = elementWise((x, y) => this.opts.a-x*log10(y), b, u); // a-b*log10(u)
    var I = indexOfAll(r.map((ri) => ri > 0.5), true);
    setSub(beta, I, elementWise((x, y) => this.opts.a+x*log10(y), 
      getSub(b, I),  getSub(u, I))); // a+b*log10(u)
    
    var mother = getSub(this.state.Population, index(range(0, nvars - 1), 
      getSub(iParents, getSub(sParents, range(0, nParents/2-1))), nvars));
    var father = getSub(this.state.Population, index(range(0, nvars - 1), 
      getSub(iParents, getSub(sParents, range(nParents/2, nParents-1))), nvars));
    var children = plus(concatRow(nvars, mother, father), 
      elementWise((a, b, c) => a*abs(b-c), 
      repCol(beta, 2), repCol(mother, 2), repCol(father, 2)));
    return children;
  }
  
  /**
   * Applies power mixed mutation to selected individuals.
   */
  powerMixedMutation() {
    var N = this.problem.IntCon.length;
    var nvars = this.problem.nvars;
    var nMutants = this.state.ReproductionCount.mutants;
    var sParents = this.state.parentsSelection.mutation;

    var p = scale(ones(nvars * nMutants), this.opts.p_real);
    if(N) {
      setSub(p, index(this.problem.IntCon, range(0, nMutants - 1), nvars), 
        scale(ones(N * nMutants), this.opts.p_integer));
    }
    var s1 = arrayRand(zeros(nvars), ones(nvars), nvars, nMutants, this.rand);
    var r = arrayRand(zeros(nvars), ones(nvars), nvars, nMutants, this.rand);
    var s = elementWise((a, b) => Math.pow(a, b), s1, p);
     
    var parents = getSub(this.state.Population, 
      getSub(sParents, index(range(0, nvars - 1), sParents, nvars)));
    var mutants;
    
    if(!this.bounded) {
      mutants = elementWise((a, b, c) => c < 0.5 ? a + b : a - b, parents, s, r);
    } else {
      var ubm = repCol(this.opts.ub, nMutants);
      var lbm = repCol(this.opts.lb, nMutants);
      var t = elementWise((a, b, c) => (a - b)/(c - a), parents, this.opts.lb, this.opts.ub);
      mutants = elementWise((a, b, c) => a+b*(a-c), parents, s, lbm);
      
      var I = indexOfAll(elementWise((a, b) => a < b, t, r), true);
      setSub(mutants, I, elementWise((a, b, c) => a-b*(c-a), 
        getSub(parents, I), getSub(s, I), getSub(ubm, I)));
    }

    return mutants;
  }
  
  /**
   * Applies Gaussian mutation to selected individuals.
   */
  gaussianMutation() {
    
  }
  
  /**
   * Ensures integer constraints are met for specific variables.
   */
  integerRestriction() {
    var N = this.problem.IntCon.length;
    if(N) {
      var I = index(this.problem.IntCon, 
        [...this.selection.children, ...this.selection.mutants], this.problem.nvars);
      var p = getSub(this.state.Population, I);
      
      var r = arrayRandi([0, 1], N, 
        this.state.ReproductionCount.children + 
        this.state.ReproductionCount.mutants, this.rand);
      
      var Is = indexOfAll(neg(isInteger(p)), true);
      setSub(p, Is, plus(fix(getSub(p, Is)), getSub(r, Is)));
      setSub(this.state.Population, I, p);
    }
  }
  
  /**
   * Checks and enforces variable bounds within the population.
   */
  checkBounds() {   
    this.state.Population = elementWise((a, b, c) => min([max([a, b]), c]), 
      this.state.Population, this.opts.lbm, this.opts.ubm);
  }
  
  /**
   * Evaluates whether stopping criteria have been met.
   * @returns {number} Code indicating the reason to stop or continue.
   */
  stoppingCriteria() {
    var stop = 0;
    var gen = this.state.Generation;
    
    if(gen > 0) {
      if(this.state.Best[gen] < this.state.Best[gen - 1] || 
          !this.state.Feasible[gen] || 
          this.state.Feasible[gen] > this.state.Feasible[gen - 1]) {
        this.state.StallTime = tic;
        this.state.StallGenerations = 1;
      } else {
        this.state.StallGenerations = this.state.StallGenerations + 1;
      }
    }
    
    if(gen >= (this.opts.MaxGenerations - 1)) {   
      // 1 - Maksimalni broj generacija ostvaren
      stop = 1;
    } else if(toc(this.state.StartTime) >= this.opts.MaxTime) {
      // 2 - Proteklo maksimalno vreme trajanja optimizacije
      stop = 2;
    } else if(this.state.Feasible[gen] && 
        this.state.Best[gen] <= this.opts.FitnessLimit) {
      // 3 - Funkcija prilagodjenosti dostiglja ciljanu vrednost
      stop = 3;
    } else if(gen > (this.opts.MaxStallGenerations - 2) && 
        this.state.Feasible[gen - (this.opts.MaxStallGenerations - 2)] && 
        this.state.Feasible[gen] && 
        ((this.state.Best[gen - (this.opts.MaxStallGenerations - 2)] -
        this.state.Best[gen]) <= this.opts.FunctionTolerance)) {
      // 4 - Promena vrednosti funkcija manja od tolerancije
      stop = 4;
    } else if(this.state.StallGenerations >= this.opts.MaxStallGenerations) {
      // 5 - Bez promene vrednosti funkcije kroz odredjeni broj generacija
      stop = 5;
    } else if(toc(this.state.StallTime) >= this.opts.MaxStallTime) {
      // 6 - Bez promene vrednosti funkcije odredjeno vreme
      stop = 6;
    } else if(this.stoped) {
      // 7 - Korisnik zaustavlja proces
      stop = 7;
    }
    return stop;
  }
  
  /**
   * Initializes the population for the optimization process.
   */
  initPopulation() {
    this.state.Population = this.creationFcn();
    this.integerRestriction();
    if(this.bounded) {
      this.checkBounds();
    }
  }
  
  /**
   * Initializes the internal state of the algorithm.
   */
  initState() {
    // Merenje vremena
    this.state.GenTime = tic;
    
    this.state.FunVal = zeros(this.opts.PopulationSize);
    
    this.state.ConSumVal = zeros(this.opts.PopulationSize);
    this.state.Best = zeros(this.opts.MaxGenerations);
    this.state.Feasible = ones(this.opts.MaxGenerations);
    this.state.Time = zeros(this.opts.MaxGenerations);
    this.state.x = zeros(this.opts.MaxGenerations * this.problem.nvars);

    this.state.ReproductionCount = {};
    this.state.ReproductionCount.elite = this.opts.EliteCount;
    this.state.ReproductionCount.children = fix(this.opts.CrossoverFraction * 
      (this.opts.PopulationSize - this.opts.EliteCount));

    if(mod(this.state.ReproductionCount.children, 2) != 0) {
      this.state.ReproductionCount.children = this.state.ReproductionCount.children - 1;
    }

    this.state.ReproductionCount.mutants = this.opts.PopulationSize - 
      (this.state.ReproductionCount.elite + this.state.ReproductionCount.children);

    this.state.parentsCount = {};
    this.state.parentsCount.crossover = this.state.ReproductionCount.children;
    this.state.parentsCount.mutation = this.state.ReproductionCount.mutants;
    this.state.nParents = this.state.parentsCount.crossover + 
      this.state.parentsCount.mutation;

    this.state.parentsSelection = {};
    this.state.parentsSelection.crossover = range(0, 
      this.state.parentsCount.crossover - 1);
    this.state.parentsSelection.mutation = plus(
      this.state.parentsCount.crossover, 
      range(0, this.state.parentsCount.mutation - 1));
    
    this.selection.elite = range(0, this.state.ReproductionCount.elite - 1);
    this.selection.children = plus(this.state.ReproductionCount.elite, 
      range(0, this.state.ReproductionCount.children - 1));
    this.selection.mutants = plus((this.state.ReproductionCount.elite + 
      this.state.ReproductionCount.children), 
      range(0, this.state.ReproductionCount.mutants - 1));

    if(this.constrained) {
      this.state.ConSize = [
        this.problem.nonlconfcn(zeros(this.problem.nvars)).length, this.opts.PopulationSize];
      
      this.state.ConVal = zeros(this.state.ConSize[0] * this.state.ConSize[1]);
      this.state.ConNormVal = zeros(this.state.ConSize[0] * this.state.ConSize[1]);
    }
  }
  
  /**
   * Updates the current state of the algorithm based on evaluations.
   */
  async updateState() {
    await this.evalFitnessFcn();
    if(this.constrained) {
      await this.evalConstraintsFcn();
      this.updatePenalty();
    }
    this.state.Time[this.state.Generation] = toc(this.state.GenTime);
    var i;
    [this.state.Best[this.state.Generation], i] = mini(this.state.FunVal);
    setSub(this.state.x, index(range(0, this.problem.nvars - 1), 
       this.state.Generation,  this.problem.nvars), 
       getSub(this.state.Population, 
       index(range(0, this.problem.nvars - 1), i,  this.problem.nvars)));
    
    if(this.constrained && this.state.ConSumVal[i] > 0) {
      this.state.Feasible[this.state.Generation] = 0;
    }
  }
  
  /**
   * Updates penalty values based on constraint violations.
   */
  updatePenalty() {
    if(any(this.state.ConSumVal.map((a) => a == 0))) {
      if(this.state.Generation == 0) {
        var [s, i] = sorti(this.state.FunVal);
        this.selection.current_elite = getSub(i, this.selection.elite);
      }
      var fmin;
      if(this.state.ReproductionCount.elite > 0) {
        // Ne moze da bude bolje od najgore elitne jedinke
        fmin = max(getSub(this.state.FunVal, this.selection.current_elite));
      } else {
        // Ne moze da bude bolje od najbolje jedinike
        fmin = min(getSub(this.state.FunVal, this.selection.current_elite));
      }
      var I1 = indexOfAll(elementWise((a, b) => a > 0 && b <= fmin, 
        this.state.ConSumVal, this.state.FunVal), true);
      var I2 = indexOfAll(elementWise((a, b) => a > 0 && b > fmin, 
        this.state.ConSumVal, this.state.FunVal), true);
      setSub(this.state.FunVal, I1, plus(fmin, 
        getSub(this.state.ConSumVal, I1)));
      setSub(this.state.FunVal, I2, plus(getSub(this.state.FunVal, I2), 
        getSub(this.state.ConSumVal, I2)));
    } else {
      this.state.FunVal = this.state.ConSumVal;
    }
  }
  
  /**
   * Evaluates the fitness function for the current population.
   */
  async evalFitnessFcn() {
    var obj = this;
    var nvars = this.problem.nvars;
    
    var p;
    var n;
    if(this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      p = getSub(this.state.Population, index(range(0, nvars - 1), 
        [...this.selection.children, ...this.selection.mutants], nvars));
      n = this.state.ReproductionCount.children + this.state.ReproductionCount.mutants;
    } else {
      p = this.state.Population;
      n = this.opts.PopulationSize;
    }
    
    var val;
    if(this.opts.UseVectorized) {
      val = this.problem.fitnessfcn(p);
    } else {
      if(this.opts.UseParallel) {
        val = await parallel.parfor(0, n-1, 1, parallel.getProcessorsNum(), 
          this.parallel_context, this.parallel_setup_fun, `function(i) {
            var fun = ${obj.problem.fitnessfcn.toString()};
            return fun(getSub(${JSON.stringify(p)}, index(range(0, ${nvars} - 1), i, ${nvars})));
        }`);
      } else {
        val = zeros(n);
        for(var i = 0; i < n; i++) {
          val[i] = this.problem.fitnessfcn(getSub(p, index(range(0, nvars - 1), i, nvars)));
        }
      }
    }
    
    if(this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      this.state.FunVal = [...getSub(this.state.FunVal, this.selection.current_elite), ...val];
    } else {
      this.state.FunVal = val;
    }
  }
  
  /**
   * Evaluates constraint functions for the current population.
   */
  async evalConstraintsFcn() {
    var obj = this;
    var nvars = this.problem.nvars;
    
    var p;
    var n;
    var m = this.state.ConSize[0];
    if(this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      p = getSub(this.state.Population, index(range(0, nvars - 1), 
        [...this.selection.children, ...this.selection.mutants], nvars));
      n = this.state.ReproductionCount.children + this.state.ReproductionCount.mutants;
    } else {
      p = this.state.Population;
      n = this.opts.PopulationSize;
    }
    
    var val;
    if(this.opts.UseVectorized) {
      val = obj.problem.nonlconfcn(p);
    } else {
      if(this.opts.UseParallel) {
        val = await parallel.parfor(0, n-1, 1, parallel.getProcessorsNum(), 
          this.parallel_context, this.parallel_setup_fun, `function(i) {
            var fun = ${obj.problem.nonlconfcn.toString()};
            return fun(getSub(${JSON.stringify(p)}, index(range(0, ${nvars} - 1), i, ${nvars})));
        }`);
        val = val.flat();
      } else {
        m = this.state.ConSize[0];
        val = zeros(m * n);
        for(var i = 0; i < n; i++) {
          setSub(val, index(range(0, m - 1), i, m), 
            this.problem.nonlconfcn(getSub(p, 
            index(range(0, nvars - 1), i, nvars))));
        }
      }
    }
    if(this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      this.state.ConVal = concatCol(m, getSub(this.state.ConVal, 
        index(range(0, m - 1), this.selection.current_elite, m)), val);
    } else {
      this.state.ConVal = val;
    }
    this.normConstraintsFcn();
    this.state.ConSumVal = sumCol(this.state.ConNormVal, m, this.opts.PopulationSize);
  }
  
  /**
   * Normalizes constraint values to maintain consistent scaling.
   */
  normConstraintsFcn() {
    var ConNormVal = this.state.ConVal;
    var sNaN = indexOfAll(isNaN(ConNormVal), true);
    var sInf = indexOfAll(isInfinity(ConNormVal), true);
    var sNeg = indexOfAll(isNegative(ConNormVal), true);
    
    setSub(ConNormVal, sNaN, zeros(sNaN.length));
    setSub(ConNormVal, sInf, zeros(sInf.length));
    setSub(ConNormVal, sNeg, zeros(sNeg.length));

    var m = this.state.ConSize[0];
    var n = this.opts.PopulationSize;
    
    if(this.state.Generation == 0 || 
        (this.state.Generation > 0 && 
        this.state.Feasible[this.state.Generation-1])) {
      
      // Use first values of the first generation for normalization of
      // constraints until there is a feasible solution
      var l = elementWise((a) => Math.sqrt(a), 
        sumRow(elementWise((a) => Math.pow(a, 2), ConNormVal), m, n));
      var I = indexOfAll(l, 0);
      setSub(l, I, ones(I.length));
      if(isEmpty(this.l)) {
        this.l = l;
      } else {
        var s = indexOfAll(elementWise((a, b) => a > b, this.l, l), true);
        setSub(this.l, s, getSub(l, s));
      }
      
      this.lm = repCol(this.l, n);
    }

    setSub(ConNormVal, sNaN, getSub(this.lm, sNaN));
    setSub(ConNormVal, sInf, getSub(this.lm, sInf));
    this.state.ConNormVal = divideEl(ConNormVal, this.lm);
  }
}

exports.PRDC_JSLAB_OPTIM_RCMIGA = PRDC_JSLAB_OPTIM_RCMIGA;