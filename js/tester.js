/**
 * @file Javascript tester module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

if(jsl) {
  require = jsl._require;
}

const fs = require("fs");

/**
 * Class for application testing.
 */
class PRDC_JSLAB_TESTER {

  /**
   * Initializes the tester with the specified folder containing test modules.
   * Loads all test modules and prepares them for execution.
   * @param {string} folder The folder relative to the project directory where test modules are located.
   */
  constructor(folder) {
    var obj = this;
    this.path = app_path+'/js/'+folder;
    this.modules = [];
    this.tests = [];
    this.total_tests = 0;
    
    // Define function for data display
    if(jsl) {
      this.disp = jsl._console.log;
    } else {
      this.disp = console.log;
    }
    
    // Find all test modules
    try {
      var files = fs.readdirSync(this.path);
      files.forEach(function(file) {
        if(file.endsWith(".test.js")) {
          obj.modules.push(obj.path+'/'+file);
        }
      });
    } catch(err) {
      if(err) {
        this.disp(language.currentString(92) + ': ' + err);
      }
    }
    
    // Find all tests defined in test modules
    obj.modules.forEach(function(module) {
      var { MODULE_TESTS } = require(module);
      obj.total_tests += MODULE_TESTS.testsNumber();
      obj.tests.push(...MODULE_TESTS.get());
    });
  }
  
  /**
   * Executes all loaded tests, reports successes and failures, and logs the results.
   */
  runTests() {
    var obj = this;
    if(this.total_tests > 0) {
      this.disp(language.currentString(93)+' '+this.total_tests+' '+language.currentString(94)+'.');
      var i = 1;
      var passed = 0;
      var failed = 0;
      this.tests.forEach(function(test) {
        var name = test.name;
        var result = false;
        var error = '';
        try {
          result = test.run();
        } catch(e) {
          error = e;
        }
        if(!result) {
          failed += 1;
          if(error != '') {
            obj.disp(' ['+i+'/'+obj.total_tests+'] '+language.currentString(95)+' "'+name+'" - '+language.currentString(96)+': ' + error);
          } else {
            obj.disp(' ['+i+'/'+obj.total_tests+'] '+language.currentString(95)+' "'+name+'" - '+language.currentString(97)+'.');
          }
        } else {
          passed += 1;
          obj.disp(' ['+i+'/'+obj.total_tests+'] '+language.currentString(95)+' "'+name+'" - '+language.currentString(98)+'.');
        }
      });
      this.disp(language.currentString(99)+':');
      this.disp(' '+language.currentString(100)+': '+ passed);
      this.disp(' '+language.currentString(101)+': '+ failed);
    } else {
      this.disp(language.currentString(102));
    }
  }
}

exports.PRDC_JSLAB_TESTER = PRDC_JSLAB_TESTER;

/**
 * Represents a collection of tests for a specific module or functionality within the JSLAB application.
 */
class PRDC_JSLAB_TESTS {

  /**
   * Creates an instance to manage and store individual tests.
   */
  constructor() {
    var obj = this;
    this.tests = [];
  }
  
  /**
   * Adds a new test to the collection.
   * @param {string} name The name of the test.
   * @param {Function} fun The test function to execute.
   */
  add(name, fun) {
    this.tests.push(new PRDC_JSLAB_TEST(name, fun));
  }
  
  /**
   * Returns all tests added to this collection.
   * @returns {Array} An array of all tests within this collection.
   */
  get() {
    return this.tests;
  }
  
  /**
   * Returns the number of tests in the collection.
   * @returns {number} The total number of tests.
   */
  testsNumber() {
    return this.tests.length;
  }
}

exports.PRDC_JSLAB_TESTS = PRDC_JSLAB_TESTS;

/**
 * Represents an individual test within a test suite.
 */
class PRDC_JSLAB_TEST {

  /**
   * Initializes a new test with a name and a test function.
   * @param {string} name The name of the test.
   * @param {Function} fun The function to execute as the test.
   */
  constructor(name, fun) {
    this.name = name;
    this.fun = fun;
  }
  
  /**
   * Executes the test function and returns the result.
   * @returns {boolean} The result of the test function execution, true for pass and false for fail.
   */
  run() {
    return this.fun();
  }
}

exports.PRDC_JSLAB_TEST = PRDC_JSLAB_TEST;
