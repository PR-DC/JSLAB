/**
 * @file JSLAB library eval
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB library eval.
 */
class PRDC_JSLAB_EVAL {
  
  /**
   * Constructs a eval submodule object with access to JSLAB's electron environment functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    // Errors handling
    this.jsl.context.addEventListener('unhandledrejection', function(e) { 
      if(e && e.reason) {
        if('stack' in e.reason) {
          obj.rewriteError('@jslab: '+e.reason.stack.toString());
        } else if(e.reason.message) {
          obj.jsl.env.error('@jslab: '+e.reason.message, false);
        }
        e.preventDefault();
      }
    });

    this.jsl.context.addEventListener('error', function(e) {
      if(e && e.error && 'stack' in e.error) {
        obj.rewriteError('@jslab: '+e.error.stack.toString());
      } else if(e && e.error && e.error.message) {
        obj.jsl.env.error('@jslab: '+e.error.message, false);
      }
      
      e.preventDefault();
    });
  }

  /**
   * Evaluates a block of code as a string within the JSLAB environment.
   * @param {String} code The code block to evaluate.
   * @param {Boolean} [show_output=true] If true, displays the output of the code block.
   * @param {String} [jsl_file_name='jslcmdwindow'] The name of the file context for the code block.
   */
  async evalCodeFromMain(code, show_output = true, jsl_file_name = 'jslcmdwindow') {
    var obj = this;

    this.jsl.onEvaluating();
    this.jsl.jsl_file_name = jsl_file_name;
    this.jsl.current_script =  jsl_file_name;
    
    this.source_codes = [];
    this.transformed_codes = [];
    this.source_maps = [];
    this.current_source_code;
    this.current_source_map;    
    
    this.jsl.savePreviousWorkspace();
    this.jsl.loadPreviousWorkspace();

    function onError(err) {
      obj.jsl.onEvaluated();
      if(err.name == 'JslabError') {
        obj.jsl.env.error(err.message, false);
      } else {
        obj.rewriteError(err.stack.toString());
      }
    }
    
    try {
      var data = await this.evalString(code, show_output);
      if(obj.jsl.no_ans == false) {
        obj.jsl.context.ans = data;
      }
      if(show_output && obj.jsl.ignore_output == false) {
        obj.jsl.env.showAns(prettyPrint(data));
      }
      obj.jsl.onEvaluated();
    } catch(err) {
      onError(err);
    }
  }
  
  /**
   * Evaluates a string of code and handles errors and output.
   * @param {String} code The code string to evaluate.
   * @param {Boolean} [show_output=true] If true, displays the output of the code block.
   * @returns {*} The result of the evaluated code.
   */
  async evalString(code, show_output = true) { 
    var rewrite_result = this.rewriteCode(code);
    this.source_maps.push(rewrite_result.map);
    this.transformed_codes.push(rewrite_result.code);
    this.source_codes.push(code);
    
    var current_source_code = this.current_source_code;
    var current_source_map = this.current_source_map;
    this.current_source_code = code;
    this.current_source_map = rewrite_result.map;

    var result = await this.jsl._eval(rewrite_result.code);
    
    this.current_source_code = current_source_code;
    this.current_source_map = current_source_map;
    return result;
  }
  
  /**
   * Executes a script file within the JSLAB environment.
   * @param {String} script_path The path to the script file to be executed.
   * @param {Array} [lines] Specifies a range of lines to execute, if provided.
   * @param {Boolean} [silent=false] If true, suppresses output from the script.
   * @param {Boolean} [force_run=false] If true, forces the script to run even if stop conditions are met.
   */
  async runScript(script_path, lines, silent = false, force_run = false) {
    script_path = this.jsl.pathResolve(script_path);
    if(script_path) {
      this.jsl.current_script = script_path;
      this.jsl.jsl_file_name = this.jsl.env.basenamePath(script_path);
      
      var script_code = this.jsl.env.readFileSync(script_path);
      if(script_code === false) {
        this.jsl.env.error('@runScript: '+language.string(103)+': '+ script_path, false);
      } else {
        script_code = script_code.toString();
        if(lines !== undefined) {
          var code_lines = script_code.split('\n');
          if(typeof lines == 'number') {
            if(code_lines.length >= lines) {
              code_lines[lines-1];
            } else {
              this.jsl.env.error('@runScript: '+language.string(104)+'!\n '+language.string(105)+': '+ script_path, false);
            }
          } else {
            if(code_lines.length >= lines[0] && code_lines.length >= lines[1]) {
              code_lines = code_lines.slice(lines[0]-1, lines[1]-1);
            } else {
              this.jsl.env.error('@runScript: '+language.string(104)+'!\n '+language.string(105)+': '+ script_path);
            }
          }
        }
        await this.evalString(script_code, !silent);
      }
    }
  } 

  /**
   * Re-evaluates the last script file that was executed in the environment.
   */
  async runLast() {
    var cmd;
    if(this.jsl.last_script_lines !== undefined) {
      cmd = 'run(' + JSON.stringify(this.jsl.last_script_path) + ', ' + this.jsl.last_script_lines.toString() + '", undefined, true)';
    } else {
      cmd = 'run(' + JSON.stringify(this.jsl.last_script_path) + ', undefined, false, true)';
    }
    await this.evalCodeFromMain(cmd, false);
  }
  
  /**
   * Extracts and logs error information from the stack trace.
   * @param {String} stack The error stack trace.
   */
  async rewriteError(stack, on_rewrite = false) {
    this.jsl._console.log(stack);
    
    const regex_normal = /at\s(.*?)\s\((.*\\.*?):(\d+):(\d+)\)/;
    const regex_eval = /eval at evalString\s*\(.*:(\d+):(\d+)\)$/;
    const regex_rewrite = /\((\d+):(\d+)\)/;
    var lines = stack.split('\n');
    var msg = lines[0];
    
    if(on_rewrite) {
      msg = msg.replace(/\(\d+:\d+\)/g, '');
      msg += "\n  "+language.string(114)+" ";
      let matchs = lines[0].match(regex_rewrite);
      let line = parseInt(matchs[1]);
      let column = parseInt(matchs[2]);
      var result = await this.getOriginalPosition(end(this.source_maps), line, column);
      
      msg += "(" + this.jsl.current_script + ") "+language.string(112)+": " + result.line + ", "+language.string(113)+": " +  result.column;
      throw {
        name: 'JslabError',
        message: msg
      };
    } else {
      if(lines[3] == '    at PRDC_JSLAB_LIB.eval [as _eval] (<anonymous>)') {
        this.jsl.env.error(msg + ' (' + this.jsl.current_script + ')', false);
        return;
      }
      
      for(let i = 1; i < lines.length; i++) {
        if(lines[i].includes("eval at evalString (")) {
          msg += "\n  "+language.string(114)+" ";
          let matchs = lines[i].match(regex_eval);
          let line = parseInt(matchs[1]);
          let column = parseInt(matchs[2]);
          var result = await this.getOriginalPosition(end(this.source_maps), line, column);
          
          msg += "(" + this.jsl.current_script + ") "+language.string(112)+": " + result.line + ", "+language.string(113)+": " +  result.column;
          break;
        } else {
          let matchs = lines[i].match(regex_normal);
          if(matchs) {
            msg += "\n  "+language.string(114)+" ";
            let expression = matchs[1];
            let path = matchs[2];
            let line = parseInt(matchs[3]);
            let column = parseInt(matchs[4]);
            var result = await this.getOriginalPosition(end(this.source_maps), line, column);
            
            msg += expression + " (" + path + ") "+language.string(112)+": " + result.line + ", "+language.string(113)+": " +  result.column;
          }
        }
      }
      this.jsl.env.error(msg, false);
    }
  }
  
  /**
   * Extracts the position (line and column) of an expression from an error stack trace, providing context for debugging.
   * @returns {Array} An array containing the line number, column number, and script path of the expression causing the error.
   */
  async getExpressionPosition() {
    var err = new Error();
    var stack = err.stack;

    const regex_normal = /at\s(.*?)\s\((.*\\.*?):(\d+):(\d+)\)/;
    const regex_eval = /eval at evalString\s*\(.*:(\d+):(\d+)\)$/;
    var lines = stack.split('\n');
    var line;
    var script;
    
    for(let i = 2; i < lines.length; i++) {
      if(lines[i].includes("eval at evalString (")) {
        let matchs = lines[i].match(regex_eval);
        line = parseInt(matchs[1]);
        column = parseInt(matchs[2]);
        script = this.jsl.current_script;
        break;
      } else {
        let matchs = lines[i].match(regex_normal);
        if(matchs) {
          line = parseInt(matchs[3]);
          column = parseInt(matchs[4]);
          script = matchs[2];
          break;
        }
      }
    }
    
    var result = await this.getOriginalPosition(end(this.source_maps), line, column);
    return [result.line, result.column, script];
  }
  
  /**
   * Retrieves the original source position from a source map.
   * @param {Object} map - The source map object.
   * @param {number} line - The line number in the generated code.
   * @param {number} column - The column number in the generated code.
   * @returns {Promise<Object>} An object containing the original source position, including source file, line, and column.
   */
  async getOriginalPosition(map, line, column) {
    this.jsl.override.withoutCheckStop = true;
    var smc = await new this.jsl.env.SourceMapConsumer(end(this.source_maps));
    this.jsl.override.withoutCheckStop = false;
    var result = smc.originalPositionFor({ line: line, column: column });
    smc.destroy();
    return result;
  }
  
  /**
   * Extracts the body of a given function as a string.
   * @param {Function} fun - The function from which to extract the body.
   * @returns {string|undefined} The body of the function as a string, or `undefined` if it cannot be extracted.
   */
  getFunctionBody(fun) {
    if(typeof fun == 'function') {
      const funStr = fun.toString();
      const bodyMatch = funStr.match(/{([\s\S]*)}/);
      if(bodyMatch && bodyMatch[1]) {
        return bodyMatch[1];
      }
    }
    return undefined;
  }
  
  /**
   * Rewrites a string of code using Recast and Babel Parser.
   * @param {String} code The code string to evaluate.
   * @returns {String} The rewritten code.
   */
  rewriteCode(code) {
    const obj = this;

    // Trick from devtools: Wrap code in parentheses if it's an object literal
    if(/^\s*\{/.test(code) && /\}\s*$/.test(code)) {
      code = '(' + code + ')';
    }

    if(config.DEBUG_PRE_TRANSFORMED_CODE) {
      obj.jsl._console.log(code);
    }
    
    // Parse the code into an AST using Recast with Babel parser
    var ast;
    try {
      ast = this.jsl.env.recast.parse(code, {
        parser: {
          parse(source) {
            return obj.jsl.env.babel_parser.parse(source, {
              sourceType: 'module',
              plugins: [
                'jsx',
                'typescript',
                'classProperties',
                'dynamicImport',
                'optionalChaining',
                'nullishCoalescingOperator',
                "@babel/plugin-syntax-top-level-await"
              ],
            });
          },
        },
        sourceFileName: "source.js"
      });
    } catch(e) {
      this.jsl._console.log(e);
      this.rewriteError(e.stack, true);
    }

    // Function to check for forbidden names in patterns
    function checkPattern(pattern) {
      if(pattern.type === 'Identifier') {
        if(config.FORBIDDEN_NAMES.includes(pattern.name)) {
          throw {
            name: 'JslabError',
            message: `${language.string(185)}: '${pattern.name}' ${language.string(184)}`,
          };
        }
      } else if(pattern.type === 'ObjectPattern') {
        pattern.properties.forEach((prop) => {
          if(prop.type === 'RestElement') {
            checkPattern(prop.argument);
          } else {
            checkPattern(prop.value);
          }
        });
      } else if(pattern.type === 'ArrayPattern') {
        pattern.elements.forEach((element) => {
          if(element) checkPattern(element);
        });
      } else if(pattern.type === 'RestElement') {
        checkPattern(pattern.argument);
      } else if(pattern.type === 'AssignmentPattern') {
        checkPattern(pattern.left);
      }
    }

    // Traverse the AST to check for forbidden names
    this.jsl.env.recast.types.visit(ast, {
      visitVariableDeclarator(path) {
        checkPattern(path.node.id);
        this.traverse(path);
      },
      visitFunctionDeclaration(path) {
        const node = path.node;
        if(node.id && config.FORBIDDEN_NAMES.includes(node.id.name)) {
          throw {
            name: 'JslabError',
            message: `${language.string(186)}: '${node.id.name}' ${language.string(184)}`,
          };
        }
        this.traverse(path);
      },
      visitClassDeclaration(path) {
        const node = path.node;
        if(node.id && config.FORBIDDEN_NAMES.includes(node.id.name)) {
          throw {
            name: 'JslabError',
            message: `${language.string(187)}: '${node.id.name}' ${language.string(184)}`,
          };
        }
        this.traverse(path);
      },
      visitImportDeclaration(path) {
        path.node.specifiers.forEach((specifier) => {
          if(config.FORBIDDEN_NAMES.includes(specifier.local.name)) {
            throw {
              name: 'JslabError',
              message: `${language.string(188)}: '${specifier.local.name}' ${language.string(184)}`,
            };
          }
        });
        this.traverse(path);
      },
      visitAssignmentExpression(path) {
        checkPattern(path.node.left);
        this.traverse(path);
      },
    });

    const b = this.jsl.env.recast.types.builders;
    const transformedBody = [];

    // Helper function to transform patterns to assign to jsl.context
    function transformPatternToContext(pattern) {
      if(pattern.type === 'Identifier') {
        // Replace identifier with jsl.context.identifier
        return b.memberExpression(
          b.memberExpression(b.identifier('jsl'), b.identifier('context')),
          b.identifier(pattern.name),
          false
        );
      } else if(pattern.type === 'ObjectPattern') {
        return b.objectPattern(
          pattern.properties.map((prop) => {
            if(prop.type === 'RestElement') {
              return b.restElement(transformPatternToContext(prop.argument));
            }
            return b.objectProperty(
              prop.key,
              transformPatternToContext(prop.value),
              prop.computed,
              false // Shorthand is false because we've replaced the identifier
            );
          })
        );
      } else if(pattern.type === 'ArrayPattern') {
        return b.arrayPattern(
          pattern.elements.map((element) => {
            if(element) {
              return transformPatternToContext(element);
            }
            return null;
          })
        );
      } else if(pattern.type === 'RestElement') {
        return b.restElement(transformPatternToContext(pattern.argument));
      } else if(pattern.type === 'AssignmentPattern') {
        return b.assignmentPattern(
          transformPatternToContext(pattern.left),
          pattern.right
        );
      }
      return pattern;
    }
    
    var tempVarCounter = 0;
    // Transform top-level variable declarations and handle imports
    ast.program.body.forEach((node) => {
      if(node.type === 'VariableDeclaration') {
        node.declarations.forEach((decl) => {
          if(decl.id.type === 'ArrayPattern') {
            // Handle ArrayPattern by creating a temporary variable and individual assignments
            const tempVarName = `__temp${tempVarCounter++}`;
            // const __tempX = <init>;
            const tempVarDeclaration = b.variableDeclaration(node.kind, [
              b.variableDeclarator(b.identifier(tempVarName), decl.init),
            ]);
            transformedBody.push(tempVarDeclaration);

            // For each element in the ArrayPattern, assign to jsl.context
            decl.id.elements.forEach((element, index) => {
              if(element && element.type === 'Identifier') {
                const transformedLeft = b.memberExpression(
                  b.memberExpression(b.identifier('jsl'), b.identifier('context')),
                  b.identifier(element.name),
                  false
                );
                const rightAccess = b.memberExpression(
                  b.identifier(tempVarName),
                  b.numericLiteral(index),
                  true // Computed property (array index)
                );
                const assignment = b.expressionStatement(
                  b.assignmentExpression('=', transformedLeft, rightAccess)
                );
                transformedBody.push(assignment);
              } else if(element && element.type === 'RestElement') {
                // Handle RestElement (e.g., ...rest)
                const transformedLeft = transformPatternToContext(element.argument);
                const rightSlice = b.callExpression(
                  b.memberExpression(
                    b.identifier(tempVarName),
                    b.identifier('slice'),
                    false
                  ),
                  [b.numericLiteral(index)]
                );
                const assignment = b.expressionStatement(
                  b.assignmentExpression('=', transformedLeft, rightSlice)
                );
                transformedBody.push(assignment);
              }
              // Handle other element types (e.g., AssignmentPattern, nested patterns) as needed
            });
          } else {
            // Existing handling for other patterns
            const transformedId = transformPatternToContext(decl.id);
            const assignment = b.expressionStatement(
              b.assignmentExpression(
                '=',
                transformedId,
                decl.init || b.identifier('undefined')
              )
            );
            transformedBody.push(assignment);
          }
        });
      } else if(node.type === 'ImportDeclaration') {
        node.specifiers.forEach((specifier) => {
          let requireCall;
          if(specifier.type === 'ImportDefaultSpecifier') {
            // const defaultExport = require('module').default;
            requireCall = b.memberExpression(
              b.callExpression(b.identifier('require'), [node.source]),
              b.identifier('default'),
              false
            );
          } else {
            // const { namedExport } = require('module');
            requireCall = b.callExpression(b.identifier('require'), [node.source]);
          }

          const left = b.memberExpression(
            b.memberExpression(b.identifier('jsl'), b.identifier('context')),
            b.identifier(specifier.local.name),
            false
          );

          const right =
            specifier.type === 'ImportDefaultSpecifier' ? requireCall
              : b.memberExpression(requireCall, b.identifier(specifier.imported.name), false);

          const assignment = b.expressionStatement(
            b.assignmentExpression('=', left, right)
          );

          transformedBody.push(assignment);
        });
      } else {
        transformedBody.push(node);
      }
    });

    // Ensure the value of the last expression is returned
    if(transformedBody.length > 0) {
      const lastNode = transformedBody[transformedBody.length - 1];
      if(lastNode.type === 'ExpressionStatement') {
        // Replace it with a return statement
        transformedBody[transformedBody.length - 1] = b.returnStatement(lastNode.expression);
      } else if(lastNode.type !== 'ReturnStatement') {
        // Not an expression or return statement, so append 'return undefined;'
        transformedBody.push(
          b.returnStatement(b.identifier('undefined'))
        );
      }
    } else {
      // If the body is empty, add 'return undefined;'
      transformedBody.push(
        b.returnStatement(b.identifier('undefined'))
      );
    }

    // Reconstruct the AST with the transformed body
    const transformedAST = b.program(transformedBody);

    // Generate code from the transformed AST with Recast
    var result = this.jsl.env.recast.print(transformedAST, {
      sourceMapName: 'transformed.js.map',
    });

    // Wrap the code in an async IIFE to allow top-level await
    var transformedCode = `(async () => { ${result.code} })()`;
    
    if(config.DEBUG_TRANSFORMED_CODE) {
      obj.jsl._console.log(transformedCode);
      obj.jsl._console.log(result.map);
    }

    return {code: transformedCode, map: result.map};
  }
}

exports.PRDC_JSLAB_EVAL = PRDC_JSLAB_EVAL;