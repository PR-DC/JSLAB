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
   * @param {Object} jsl - Reference to main JSLAB object.
   * @param {Object} problem - The optimization problem definition.
   * @param {Object} opts - Configuration options for the algorithm.
   */
  constructor(jsl, problem, opts) {
    this.jsl = jsl;
    this.lang = this.jsl.inter.lang;
    this.inter = this.jsl.inter;
    this.flag = 'preinit';
    this.problem = problem;
    this.opts = opts;
    this.state = {};
    this.selection = {};
    this.solution = {};
    this.constrained = problem.constrained;
    this.stoped = 0;

    this.checkInputs();
    if (this.bounded) {
      this.opts.lbm = this.inter.repCol(this.opts.lb, opts.PopulationSize);
      this.opts.ubm = this.inter.repCol(this.opts.ub, opts.PopulationSize);
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
    this.state.StartTime = this.inter.tic;
    this.state.StallTime = this.inter.tic;
    this.state.StallGenerations = 1;
    this.state.RandSeed = 'rcmiga';
    this.state.Generation = 0;

    this.rand = this.inter.seedRandom(this.state.RandSeed);
  }

  /**
   * Executes the optimization process.
   */
  async run(parallel_context, parallel_setup_fun) {
    if (this.opts.UseParallel) {
      this.parallel_context = parallel_context;
      this.parallel_setup_fun = parallel_setup_fun;
      this.inter.parallel.terminate();
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
    var newPopulation = this.inter.zeros(nvars * this.opts.PopulationSize);
    var stop = 0;
    while (!stop) {// Petlja za optimizaciju
      // Merenje vremena
      this.state.GenTime = this.inter.tic;

      // Elitizam
      if (this.state.ReproductionCount.elite > 0) {
        var [S, I] = this.inter.sorti(this.state.FunVal);
        this.selection.current_elite = this.inter.getSub(I, this.selection.elite);
        this.inter.setSub(newPopulation, this.inter.index(this.inter.range(0, nvars - 1),
        this.selection.elite, nvars), this.inter.getSub(this.state.Population,
        this.inter.index(this.inter.range(0, nvars - 1), this.selection.current_elite, nvars)));
      }

      //  Selekcija
      this.state.parents = this.selectionFcn();

      // Ukrstanje
      this.inter.setSub(newPopulation, this.inter.index(this.inter.range(0, nvars - 1),
      this.selection.children, nvars), this.crossoverFcn());

      // Mutacija
      this.inter.setSub(newPopulation, this.inter.index(this.inter.range(0, nvars - 1),
      this.selection.mutants, nvars), this.mutationFcn());

      // Provera granica
      this.state.Population = [...newPopulation];
      this.integerRestriction();
      if (this.bounded) {
        this.checkBounds();
      }

      // Odredjivanje vrednosti funkcije prilagodjenosti i ogranicenja
      this.state.Generation = this.state.Generation + 1;
      await this.updateState();

      // Prikaz stanja
      stop = this.stoppingCriteria(); // Kriterijumi zaustavljanja
      this.outputFcn();
      this.plotFcn();
      await this.inter.waitMSeconds(5);
    }

    this.solution.generations = this.state.Generation;
    var [x_min, I] = this.inter.mini(this.state.FunVal);
    this.solution.feasible = 1;
    if (this.constrained && this.state.ConSumVal[I] > 0) {
      this.solution.feasible = 0;
    }
    this.solution.x = this.inter.getSub(this.state.Population,
    this.inter.index(this.inter.range(0, nvars - 1), I, nvars));
    this.solution.fval = this.problem.fitnessfcn(this.solution.x);
    this.solution.StoppingCriteria = stop;

    this.flag = 'done';
    this.outputFcn();
  }

  /**
   * Validates the input parameters and options.
   */
  checkInputs() {
    if (typeof this.problem.nonlconfcn === 'function') {
      this.constrained = 1;
    }
    if (typeof this.problem.IntCon === 'undefined') {
      this.problem.IntCon = [];
    }

    this.bounded = true;
    if (typeof this.opts.lb === 'undefined' || typeof this.opts.ub === 'undefined') {
      this.bounded = false;
      if (typeof this.opts.InitalUnboundedRange === 'undefined') {
        this.opts.InitalUnboundedRange = this.inter.createFilledArray(this.problem.nvars, [0, 1]);
      }
    } else if (this.problem.lb && this.problem.lb.length != this.problem.nvars ||
    this.problem.ub && this.problem.ub.length != this.problem.nvars) {
      throw new Error(this.lang.string(272));
    }

    if (this.opts.UseVectorized) {
      if (this.opts.UseParallel == true) {
        this.inter.disp(this.lang.currentString(300));
      } else if (this.opts.UseParallel != false) {
        this.inter.disp(this.lang.currentString(273));
      }
    } else {
      if (![true, false].includes(this.opts.UseParallel)) {
        throw new Error(this.lang.string(273));
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
    if (['iter', 'final'].includes(this.opts.Display)) {
      this.displayOutput();
    }
  }

  /**
   * Displays the current state of optimization.
   */
  displayOutput() {
    if (this.opts.Display === 'iter') {
      switch (this.flag) {
        case 'init':
          this.inter.disp(' ' + this.lang.currentString(301));
          if (this.opts.UseVectorized) {
            this.inter.disp(' ' + this.lang.currentString(302));
          } else if (this.opts.UseParallel) {
            this.inter.disp(' ' + this.lang.currentString(303));
          }
          break;
        case 'iter':
          if (this.state.Generation === 0 || this.state.Generation % 20 === 0) {
            if (this.constrained) {
              this.inter.dispMonospaced('\n                        Best        Max           Stall');
              this.inter.dispMonospaced('   Generation           f(x)     Constraint    Generations');
            } else {
              this.inter.dispMonospaced('\n                        Best       Stall');
              this.inter.dispMonospaced('   Generation           f(x)    Generations');
            }
          }

          let fval_s = this.inter.num2str(this.state.Best[this.state.Generation], 5);
          if (this.constrained) {
            if (!this.state.Feasible[this.state.Generation]) {
              fval_s += '*';
            }
            this.inter.dispMonospaced(
              `   ${this.inter.num2str(this.state.Generation, 0).padStart(10)}   ${
              fval_s.padStart(12)}   ${
              this.inter.num2str(this.inter.max(this.state.ConSumVal), 2).padStart(12)}   ${
              this.inter.num2str(this.state.StallGenerations, 0).padStart(12)}`
            );
          } else {
            this.inter.dispMonospaced(
              `   ${this.inter.num2str(this.state.Generation, 0).padStart(10)}   ${
              fval_s.padStart(12)}   ${
              this.inter.num2str(this.state.StallGenerations, 0).padStart(12)}`
            );
          }
          break;
        case 'done':
          var str = '\n' + this.lang.currentString(304);
          if (this.constrained) {
            if (this.state.Feasible[this.state.Generation]) {
              str += ', ' + this.lang.currentString(305);
            } else {
              str += ', ' + this.lang.currentString(306);
            }
          }
          var stop_str = this.lang.currentString(307) + ' ' + this.solution.StoppingCriteria + '!';
          this.inter.disp(` ${str}, ${stop_str}\n`);
          break;
      }
    } else if (this.opts.Display === 'final') {
      if (this.flag === 'done') {
        var str = '\n' + this.lang.currentString(304);
        if (this.constrained) {
          if (this.state.Feasible[this.state.Generation]) {
            str += ', ' + this.lang.currentString(305);
          } else {
            str += ', ' + this.lang.currentString(306);
          }
        }
        var stop_str = this.lang.currentString(307) + ' ' + this.solution.StoppingCriteria + '!';
        this.inter.disp(` ${str}, ${stop_str}\n`);
      }
    }
  }

  /**
   * Creates the initial population with mixed uniform distribution.
   */
  creationMixedUniform() {
    var lb = this.opts.lb;
    var ub = this.opts.ub;
    if (!this.bounded) {
      lb = this.opts.InitalUnboundedRange.map((v) => v[0]);
      ub = this.opts.InitalUnboundedRange.map((v) => v[1]);
    }
    var N = this.problem.IntCon.length;
    var population = this.inter.arrayRand(lb, ub,
    this.problem.nvars, this.opts.PopulationSize, this.rand);
    if (N) {
      var r = this.inter.arrayRandi([0, 1], N, this.opts.PopulationSize, this.rand);
      var I = this.inter.index(this.problem.IntCon,
      this.inter.range(0, this.opts.PopulationSize - 1), this.problem.nvars);

      this.inter.setSub(population, I, this.inter.plus(this.inter.fix(this.inter.getSub(population, I)), r));
    }
    return population;
  }

  /**
   * Performs binary tournament selection of parents.
   */
  binaryTournamentSelection() {
    var parents = this.inter.zeros(this.state.nParents);
    var r1 = this.inter.arrayRandi([0, this.opts.PopulationSize - 1], 2,
    this.state.nParents, this.rand);
    var r2 = this.inter.arrayRandi([0, this.opts.PopulationSize - 1], 2,
    this.state.nParents, this.rand);
    var neq = this.inter.elementWise((a, b) => a > b, r1, r2);
    var I1 = this.inter.indexOfAll(neq, true); // closer r2
    var I2 = this.inter.indexOfAll(neq, false); // closer r1
    this.inter.setSub(parents, I1, this.inter.getSub(r2, I1));
    this.inter.setSub(parents, I2, this.inter.getSub(r1, I2));
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

    var b = this.inter.scale(this.inter.ones(nvars * nChildren / 2), this.opts.b_real);
    if (N) {
      this.inter.setSub(b, this.inter.index(this.problem.IntCon, this.inter.range(0, nChildren / 2 - 1), nvars),
      this.inter.scale(this.inter.ones(N * nChildren / 2), this.opts.b_integer));
    }
    var u = this.inter.arrayRand(this.inter.zeros(nvars), this.inter.ones(nvars), nvars, nChildren / 2, this.rand);
    var r = this.inter.arrayRand(this.inter.zeros(nvars), this.inter.ones(nvars), nvars, nChildren / 2, this.rand);
    var beta = this.inter.elementWise((x, y) => this.opts.a - x * this.inter.log10(y), b, u); // a-b*log10(u)
    var I = this.inter.indexOfAll(r.map((ri) => ri > 0.5), true);
    this.inter.setSub(beta, I, this.inter.elementWise((x, y) => this.opts.a + x * this.inter.log10(y),
    this.inter.getSub(b, I), this.inter.getSub(u, I))); // a+b*log10(u)

    var mother = this.inter.getSub(this.state.Population, this.inter.index(this.inter.range(0, nvars - 1),
    this.inter.getSub(iParents, this.inter.getSub(sParents, this.inter.range(0, nParents / 2 - 1))), nvars));
    var father = this.inter.getSub(this.state.Population, this.inter.index(this.inter.range(0, nvars - 1),
    this.inter.getSub(iParents, this.inter.getSub(sParents, this.inter.range(nParents / 2, nParents - 1))), nvars));
    var children = this.inter.plus(this.inter.concatRow(nvars, mother, father),
    this.inter.elementWise((a, b, c) => a * this.inter.abs(b - c),
    this.inter.repCol(beta, 2), this.inter.repCol(mother, 2), this.inter.repCol(father, 2)));
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

    var p = this.inter.scale(this.inter.ones(nvars * nMutants), this.opts.p_real);
    if (N) {
      this.inter.setSub(p, this.inter.index(this.problem.IntCon, this.inter.range(0, nMutants - 1), nvars),
      this.inter.scale(this.inter.ones(N * nMutants), this.opts.p_integer));
    }
    var s1 = this.inter.arrayRand(this.inter.zeros(nvars), this.inter.ones(nvars), nvars, nMutants, this.rand);
    var r = this.inter.arrayRand(this.inter.zeros(nvars), this.inter.ones(nvars), nvars, nMutants, this.rand);
    var s = this.inter.elementWise((a, b) => Math.pow(a, b), s1, p);

    var parents = this.inter.getSub(this.state.Population,
    this.inter.getSub(sParents, this.inter.index(this.inter.range(0, nvars - 1), sParents, nvars)));
    var mutants;

    if (!this.bounded) {
      mutants = this.inter.elementWise((a, b, c) => c < 0.5 ? a + b : a - b, parents, s, r);
    } else {
      var ubm = this.inter.repCol(this.opts.ub, nMutants);
      var lbm = this.inter.repCol(this.opts.lb, nMutants);
      var t = this.inter.elementWise((a, b, c) => (a - b) / (c - a), parents, this.opts.lb, this.opts.ub);
      mutants = this.inter.elementWise((a, b, c) => a + b * (a - c), parents, s, lbm);

      var I = this.inter.indexOfAll(this.inter.elementWise((a, b) => a < b, t, r), true);
      this.inter.setSub(mutants, I, this.inter.elementWise((a, b, c) => a - b * (c - a),
      this.inter.getSub(parents, I), this.inter.getSub(s, I), this.inter.getSub(ubm, I)));
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
    if (N) {
      var I = this.inter.index(this.problem.IntCon,
      [...this.selection.children, ...this.selection.mutants], this.problem.nvars);
      var p = this.inter.getSub(this.state.Population, I);

      var r = this.inter.arrayRandi([0, 1], N,
      this.state.ReproductionCount.children +
      this.state.ReproductionCount.mutants, this.rand);

      var Is = this.inter.indexOfAll(this.inter.neg(this.inter.isInteger(p)), true);
      this.inter.setSub(p, Is, this.inter.plus(this.inter.fix(this.inter.getSub(p, Is)), this.inter.getSub(r, Is)));
      this.inter.setSub(this.state.Population, I, p);
    }
  }

  /**
   * Checks and enforces variable bounds within the population.
   */
  checkBounds() {
    this.state.Population = this.inter.elementWise((a, b, c) => this.inter.min([this.inter.max([a, b]), c]),
    this.state.Population, this.opts.lbm, this.opts.ubm);
  }

  /**
   * Evaluates whether stopping criteria have been met.
   * @returns {number} Code indicating the reason to stop or continue.
   */
  stoppingCriteria() {
    var stop = 0;
    var gen = this.state.Generation;

    if (gen > 0) {
      if (this.state.Best[gen] < this.state.Best[gen - 1] ||
      !this.state.Feasible[gen] ||
      this.state.Feasible[gen] > this.state.Feasible[gen - 1]) {
        this.state.StallTime = this.inter.tic;
        this.state.StallGenerations = 1;
      } else {
        this.state.StallGenerations = this.state.StallGenerations + 1;
      }
    }

    if (gen >= this.opts.MaxGenerations - 1) {
      // 1 - Maksimalni broj generacija ostvaren
      stop = 1;
    } else if (this.inter.toc(this.state.StartTime) >= this.opts.MaxTime) {
      // 2 - Proteklo maksimalno vreme trajanja optimizacije
      stop = 2;
    } else if (this.state.Feasible[gen] &&
    this.state.Best[gen] <= this.opts.FitnessLimit) {
      // 3 - Funkcija prilagodjenosti dostiglja ciljanu vrednost
      stop = 3;
    } else if (gen > this.opts.MaxStallGenerations - 2 &&
    this.state.Feasible[gen - (this.opts.MaxStallGenerations - 2)] &&
    this.state.Feasible[gen] &&
    this.state.Best[gen - (this.opts.MaxStallGenerations - 2)] -
    this.state.Best[gen] <= this.opts.FunctionTolerance) {
      // 4 - Promena vrednosti funkcija manja od tolerancije
      stop = 4;
    } else if (this.state.StallGenerations >= this.opts.MaxStallGenerations) {
      // 5 - Bez promene vrednosti funkcije kroz odredjeni broj generacija
      stop = 5;
    } else if (this.inter.toc(this.state.StallTime) >= this.opts.MaxStallTime) {
      // 6 - Bez promene vrednosti funkcije odredjeno vreme
      stop = 6;
    } else if (this.stoped) {
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
    if (this.bounded) {
      this.checkBounds();
    }
  }

  /**
   * Initializes the internal state of the algorithm.
   */
  initState() {
    // Merenje vremena
    this.state.GenTime = this.inter.tic;

    this.state.FunVal = this.inter.zeros(this.opts.PopulationSize);

    this.state.ConSumVal = this.inter.zeros(this.opts.PopulationSize);
    this.state.Best = this.inter.zeros(this.opts.MaxGenerations);
    this.state.Feasible = this.inter.ones(this.opts.MaxGenerations);
    this.state.Time = this.inter.zeros(this.opts.MaxGenerations);
    this.state.x = this.inter.zeros(this.opts.MaxGenerations * this.problem.nvars);

    this.state.ReproductionCount = {};
    this.state.ReproductionCount.elite = this.opts.EliteCount;
    this.state.ReproductionCount.children = this.inter.fix(this.opts.CrossoverFraction * (
    this.opts.PopulationSize - this.opts.EliteCount));

    if (this.inter.mod(this.state.ReproductionCount.children, 2) != 0) {
      this.state.ReproductionCount.children = this.state.ReproductionCount.children - 1;
    }

    this.state.ReproductionCount.mutants = this.opts.PopulationSize - (
    this.state.ReproductionCount.elite + this.state.ReproductionCount.children);

    this.state.parentsCount = {};
    this.state.parentsCount.crossover = this.state.ReproductionCount.children;
    this.state.parentsCount.mutation = this.state.ReproductionCount.mutants;
    this.state.nParents = this.state.parentsCount.crossover +
    this.state.parentsCount.mutation;

    this.state.parentsSelection = {};
    this.state.parentsSelection.crossover = this.inter.range(0,
    this.state.parentsCount.crossover - 1);
    this.state.parentsSelection.mutation = this.inter.plus(
      this.state.parentsCount.crossover,
      this.inter.range(0, this.state.parentsCount.mutation - 1));

    this.selection.elite = this.inter.range(0, this.state.ReproductionCount.elite - 1);
    this.selection.children = this.inter.plus(this.state.ReproductionCount.elite,
    this.inter.range(0, this.state.ReproductionCount.children - 1));
    this.selection.mutants = this.inter.plus(this.state.ReproductionCount.elite +
    this.state.ReproductionCount.children,
    this.inter.range(0, this.state.ReproductionCount.mutants - 1));

    if (this.constrained) {
      this.state.ConSize = [
      this.problem.nonlconfcn(this.inter.zeros(this.problem.nvars)).length, this.opts.PopulationSize];

      this.state.ConVal = this.inter.zeros(this.state.ConSize[0] * this.state.ConSize[1]);
      this.state.ConNormVal = this.inter.zeros(this.state.ConSize[0] * this.state.ConSize[1]);
    }
  }

  /**
   * Updates the current state of the algorithm based on evaluations.
   */
  async updateState() {
    await this.evalFitnessFcn();
    if (this.constrained) {
      await this.evalConstraintsFcn();
      this.updatePenalty();
    }
    this.state.Time[this.state.Generation] = this.inter.toc(this.state.GenTime);
    var i;
    [this.state.Best[this.state.Generation], i] = this.inter.mini(this.state.FunVal);
    this.inter.setSub(this.state.x, this.inter.index(this.inter.range(0, this.problem.nvars - 1),
    this.state.Generation, this.problem.nvars),
    this.inter.getSub(this.state.Population,
    this.inter.index(this.inter.range(0, this.problem.nvars - 1), i, this.problem.nvars)));

    if (this.constrained && this.state.ConSumVal[i] > 0) {
      this.state.Feasible[this.state.Generation] = 0;
    }
  }

  /**
   * Updates penalty values based on constraint violations.
   */
  updatePenalty() {
    if (this.inter.any(this.state.ConSumVal.map((a) => a == 0))) {
      if (this.state.Generation == 0) {
        var [s, i] = this.inter.sorti(this.state.FunVal);
        this.selection.current_elite = this.inter.getSub(i, this.selection.elite);
      }
      var fmin;
      if (this.state.ReproductionCount.elite > 0) {
        // Ne moze da bude bolje od najgore elitne jedinke
        fmin = this.inter.max(this.inter.getSub(this.state.FunVal, this.selection.current_elite));
      } else {
        // Ne moze da bude bolje od najbolje jedinike
        fmin = this.inter.min(this.inter.getSub(this.state.FunVal, this.selection.current_elite));
      }
      var I1 = this.inter.indexOfAll(this.inter.elementWise((a, b) => a > 0 && b <= fmin,
      this.state.ConSumVal, this.state.FunVal), true);
      var I2 = this.inter.indexOfAll(this.inter.elementWise((a, b) => a > 0 && b > fmin,
      this.state.ConSumVal, this.state.FunVal), true);
      this.inter.setSub(this.state.FunVal, I1, this.inter.plus(fmin,
      this.inter.getSub(this.state.ConSumVal, I1)));
      this.inter.setSub(this.state.FunVal, I2, this.inter.plus(this.inter.getSub(this.state.FunVal, I2),
      this.inter.getSub(this.state.ConSumVal, I2)));
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
    if (this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      p = this.inter.getSub(this.state.Population, this.inter.index(this.inter.range(0, nvars - 1),
      [...this.selection.children, ...this.selection.mutants], nvars));
      n = this.state.ReproductionCount.children + this.state.ReproductionCount.mutants;
    } else {
      p = this.state.Population;
      n = this.opts.PopulationSize;
    }

    var val;
    if (this.opts.UseVectorized) {
      val = this.problem.fitnessfcn(p);
    } else {
      if (this.opts.UseParallel) {
        val = await this.inter.parallel.parfor(0, n - 1, 1, this.inter.parallel.getProcessorsNum(),
        this.parallel_context, this.parallel_setup_fun, `function(i) {
            var fun = ${obj.problem.fitnessfcn.toString()};
            return fun(getSub(${JSON.stringify(p)}, index(range(0, ${nvars} - 1), i, ${nvars})));
        }`);
      } else {
        val = this.inter.zeros(n);
        for (var i = 0; i < n; i++) {
          val[i] = this.problem.fitnessfcn(this.inter.getSub(p, this.inter.index(this.inter.range(0, nvars - 1), i, nvars)));
        }
      }
    }

    if (this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      this.state.FunVal = [...this.inter.getSub(this.state.FunVal, this.selection.current_elite), ...val];
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
    if (this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      p = this.inter.getSub(this.state.Population, this.inter.index(this.inter.range(0, nvars - 1),
      [...this.selection.children, ...this.selection.mutants], nvars));
      n = this.state.ReproductionCount.children + this.state.ReproductionCount.mutants;
    } else {
      p = this.state.Population;
      n = this.opts.PopulationSize;
    }

    var val;
    if (this.opts.UseVectorized) {
      val = obj.problem.nonlconfcn(p);
    } else {
      if (this.opts.UseParallel) {
        val = await this.inter.parallel.parfor(0, n - 1, 1, this.inter.parallel.getProcessorsNum(),
        this.parallel_context, this.parallel_setup_fun, `function(i) {
            var fun = ${obj.problem.nonlconfcn.toString()};
            return fun(getSub(${JSON.stringify(p)}, index(range(0, ${nvars} - 1), i, ${nvars})));
        }`);
        val = val.flat();
      } else {
        m = this.state.ConSize[0];
        val = this.inter.zeros(m * n);
        for (var i = 0; i < n; i++) {
          this.inter.setSub(val, this.inter.index(this.inter.range(0, m - 1), i, m),
          this.problem.nonlconfcn(this.inter.getSub(p,
          this.inter.index(this.inter.range(0, nvars - 1), i, nvars))));
        }
      }
    }
    if (this.state.ReproductionCount.elite > 0 && this.state.Generation > 0) {
      this.state.ConVal = this.inter.concatCol(m, this.inter.getSub(this.state.ConVal,
      this.inter.index(this.inter.range(0, m - 1), this.selection.current_elite, m)), val);
    } else {
      this.state.ConVal = val;
    }
    this.normConstraintsFcn();
    this.state.ConSumVal = this.inter.sumCol(this.state.ConNormVal, m, this.opts.PopulationSize);
  }

  /**
   * Normalizes constraint values to maintain consistent scaling.
   */
  normConstraintsFcn() {
    var ConNormVal = this.state.ConVal;
    var sNaN = this.inter.indexOfAll(isNaN(ConNormVal), true);
    var sInf = this.inter.indexOfAll(this.inter.isInfinity(ConNormVal), true);
    var sNeg = this.inter.indexOfAll(this.inter.isNegative(ConNormVal), true);

    this.inter.setSub(ConNormVal, sNaN, this.inter.zeros(sNaN.length));
    this.inter.setSub(ConNormVal, sInf, this.inter.zeros(sInf.length));
    this.inter.setSub(ConNormVal, sNeg, this.inter.zeros(sNeg.length));

    var m = this.state.ConSize[0];
    var n = this.opts.PopulationSize;

    if (this.state.Generation == 0 ||
    this.state.Generation > 0 &&
    this.state.Feasible[this.state.Generation - 1]) {

      // Use first values of the first generation for normalization of
      // constraints until there is a feasible solution
      var l = this.inter.elementWise((a) => Math.sqrt(a),
      this.inter.sumRow(this.inter.elementWise((a) => Math.pow(a, 2), ConNormVal), m, n));
      var I = this.inter.indexOfAll(l, 0);
      this.inter.setSub(l, I, this.inter.ones(I.length));
      if (this.inter.isEmpty(this.l)) {
        this.l = l;
      } else {
        var s = this.inter.indexOfAll(this.inter.elementWise((a, b) => a > b, this.l, l), true);
        this.inter.setSub(this.l, s, this.inter.getSub(l, s));
      }

      this.lm = this.inter.repCol(this.l, n);
    }

    this.inter.setSub(ConNormVal, sNaN, this.inter.getSub(this.lm, sNaN));
    this.inter.setSub(ConNormVal, sInf, this.inter.getSub(this.lm, sInf));
    this.state.ConNormVal = this.inter.divideEl(ConNormVal, this.lm);
  }
}

exports.PRDC_JSLAB_OPTIM_RCMIGA = PRDC_JSLAB_OPTIM_RCMIGA;
