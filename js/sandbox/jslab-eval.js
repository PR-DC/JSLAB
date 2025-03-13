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
        if(obj.jsl.ready) {
          if(e.reason.hasOwnProperty('stack')) {
            obj.rewriteError('@jslab: '+e.reason.stack.toString());
          } else if(e.reason.message) {
            obj.jsl.env.error('@jslab: '+e.reason.message, false);
          }
        } else {
          console.log(e);
          obj.jsl.env.errorInternal('@jslab [FATAL INTERNAL]: ' + e.message);
        }
        e.preventDefault();
      }
    });

    this.jsl.context.addEventListener('error', function(e) {
      if(obj.jsl.ready) {
        if(e && e.error && 'stack' in e.error) {
          obj.rewriteError('@jslab: '+e.error.stack.toString());
        } else if(e && e.error && e.error.message) {
          obj.jsl.env.error('@jslab: '+e.error.message, false);
        }
      } else {
        console.log(e);
        obj.jsl.env.errorInternal('@jslab [FATAL INTERNAL]: ' + e.message);
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
      var data = await this.evalString(code);
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
   * @returns {*} The result of the evaluated code.
   */
  async evalString(code) { 
    var rewrite_result = this.rewriteCode(code);
    if(rewrite_result) {
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
    return false;
  }
  
  /**
   * Executes a script file within the JSLAB environment.
   * @param {String} script_path The path to the script file to be executed.
   * @param {Array} [lines] Specifies a range of lines to execute, if provided.
   * @param {Boolean} [silent=false] If true, suppresses output from the script.
   */
  async runScript(script_path, lines, silent = false) {
    script_path = this.jsl.pathResolve(script_path);
    if(script_path) {
      this.jsl.current_script = script_path;
      this.jsl.jsl_file_name = this.jsl.env.pathBaseName(script_path);
      
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
        return await this.evalString(script_code, !silent);
      }
    }
    return false;
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
    await this.evalCodeFromMain(cmd);
  }
  
  /**
   * Extracts and logs error information from the stack trace.
   * @param {String} stack The error stack trace.
   */
  async rewriteError(stack, on_rewrite = false) {
    this.jsl._console.log(stack, on_rewrite);
    
    const regex_normal = /at\s(.*?)\s\((.*\\.*?):(\d+):(\d+)\)/;
    const regex_eval = /eval at evalString\s*\(.*:(\d+):(\d+)\)$/;
    const regex_rewrite = /\((\d+):(\d+)\)/;
    var lines = stack.split('\n');
    var msg = lines[0];
    
    if(on_rewrite) {
      msg = msg.replace(/\(\d+:\d+\)/g, '');
      let matchs = lines[0].match(regex_rewrite);
      if(matchs) {
        let line = parseInt(matchs[1]);
        let column = parseInt(matchs[2]);
        
        msg += "\n  "+language.string(114)+" ";
        msg += "(" + this.jsl.current_script + ") "+language.string(112)+": " + line + ", "+language.string(113)+": " +  column;
      }
      throw {
        name: 'JslabError',
        message: msg
      };
    } else {
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
            msg += expression + " (" + path + ") "+language.string(112)+": " + line + ", "+language.string(113)+": " +  column;
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
    var smc = await new this.jsl.env.SourceMapConsumer(map);
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
    let ast;
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
              tolerant: true
            });
          },
        },
        sourceFileName: "source.js"
      });
    } catch(err) {
      this.rewriteError(err.stack, true);
      return false;
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
              false
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

    let tempVarCounter = 0;
    let functionDepth = 0;

    // Helpers to track function-like scopes
    function enterFunctionScope() {
      functionDepth++;
    }
    function leaveFunctionScope() {
      functionDepth--;
    }

    const visitObj = {
      // If top-level, after the function declaration, assign it to jsl.context
      visitFunctionDeclaration(path) {
        const node = path.node;
        if(functionDepth === 0 && node.id) {
          enterFunctionScope();
          this.traverse(path);
          leaveFunctionScope();

          // Insert assignment after the function declaration
          const funcName = node.id.name;
          const assignment = b.expressionStatement(
            b.assignmentExpression(
              '=',
              b.memberExpression(
                b.memberExpression(b.identifier('jsl'), b.identifier('context')),
                b.identifier(funcName)
              ),
              b.identifier(funcName)
            )
          );
          path.insertAfter(assignment);

          return false;
        } else {
          enterFunctionScope();
          this.traverse(path);
          leaveFunctionScope();
          return false;
        }
      },

      // Same logic for arrow functions and others - no change required
      visitFunctionExpression(path) {
        enterFunctionScope();
        this.traverse(path);
        leaveFunctionScope();
        return false;
      },
      visitArrowFunctionExpression(path) {
        enterFunctionScope();
        this.traverse(path);
        leaveFunctionScope();
        return false;
      },
      visitClassMethod(path) {
        enterFunctionScope();
        this.traverse(path);
        leaveFunctionScope();
        return false;
      },
      visitObjectMethod(path) {
        enterFunctionScope();
        this.traverse(path);
        leaveFunctionScope();
        return false;
      },
      visitClassPrivateMethod(path) {
        enterFunctionScope();
        this.traverse(path);
        leaveFunctionScope();
        return false;
      },

      // If top-level class declaration, after it assign it to jsl.context
      visitClassDeclaration(path) {
        const node = path.node;
        if(functionDepth === 0 && node.id) {
          enterFunctionScope();
          this.traverse(path);
          leaveFunctionScope();

          const className = node.id.name;
          const assignment = b.expressionStatement(
            b.assignmentExpression(
              '=',
              b.memberExpression(
                b.memberExpression(b.identifier('jsl'), b.identifier('context')),
                b.identifier(className)
              ),
              b.identifier(className)
            )
          );
          path.insertAfter(assignment);

          return false;
        } else {
          enterFunctionScope();
          this.traverse(path);
          leaveFunctionScope();
          return false;
        }
      },

      visitVariableDeclaration(path) {
        const node = path.node;
        const parent = path.parent.node;
        const parentType = parent.type;
        const isTopLevel = (functionDepth === 0); // Only transform top-level declarations

        // Handle variable declarations in for‑of and for‑in loops only if at top level.
        if(
          isTopLevel &&
          (parentType === 'ForOfStatement' || parentType === 'ForInStatement') &&
          parent.left === node
        ) {
          if(node.declarations.length !== 1) {
            throw new Error("Unexpected multiple declarations in for loop");
          }
          // Replace the parent's left with the transformed identifier, without the var keyword.
          parent.left = transformPatternToContext(node.declarations[0].id);
          return false;
        }

        // Existing logic for top-level declarations:
        const shouldRewrite =
          ((node.kind === 'var') && isTopLevel) ||
          ((node.kind === 'let' || node.kind === 'const') && parentType === 'Program');

        if(!shouldRewrite) {
          this.traverse(path);
          return false;
        }

        const newAssignments = [];
  
        node.declarations.forEach((decl) => {
          if(decl.id.type === 'ArrayPattern') {
            // Handle ArrayPattern by creating a temporary variable and individual assignments
            const tempVarName = `__temp${tempVarCounter++}`;
            // Create a temporary init variable if needed
            const tempDecl = b.variableDeclaration('var', [
              b.variableDeclarator(b.identifier(tempVarName), decl.init)
            ]);
            newAssignments.push(tempDecl);

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
                  true
                );
                newAssignments.push(
                  b.expressionStatement(
                    b.assignmentExpression('=', transformedLeft, rightAccess)
                  )
                );
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
                newAssignments.push(
                  b.expressionStatement(
                    b.assignmentExpression('=', transformedLeft, rightSlice)
                  )
                );
              }
            });

          } else {
            // For normal patterns or single identifiers
            const transformedId = transformPatternToContext(decl.id);
            const assignment = b.expressionStatement(
              b.assignmentExpression('=', transformedId, decl.init || b.identifier('undefined'))
            );
            newAssignments.push(assignment);
          }
        });

        // Check if this declaration is part of a ForStatement init
        if(path.parent.node.type === 'ForStatement' && path.parent.node.init === node) {
          // For a ForStatement init, we need a single expression, not multiple statements
          const exprs = [];
          newAssignments.forEach((stmt) => {
            if(stmt.type === 'VariableDeclaration' && stmt.declarations.length === 1) {
              // Convert var temp = init into (temp = init)
              const declInit = stmt.declarations[0].init || b.identifier('undefined');
              exprs.push(b.assignmentExpression('=', b.identifier(stmt.declarations[0].id.name), declInit));
            } else if(stmt.type === 'ExpressionStatement') {
              exprs.push(stmt.expression);
            }
          });

          let initExpr;
          if(exprs.length === 1) {
            initExpr = exprs[0];
          } else {
            initExpr = b.sequenceExpression(exprs);
          }

          path.replace(initExpr);
          return false;
        } else {
          // Normal top-level or block-level declaration: replace with multiple statements
          path.replace(...newAssignments);
          return false;
        }
      },

      visitImportDeclaration(path) {
        const node = path.node;
        const newStatements = [];

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

          newStatements.push(
            b.expressionStatement(
              b.assignmentExpression('=', left, right)
            )
          );
        });

        path.replace(...newStatements);
        return false;
      }
    };

    this.jsl.env.recast.types.visit(ast, visitObj);

    // Ensure the value of the last expression is returned
    const finalBody = ast.program.body;
    if(finalBody.length > 0) {
      const lastNode = finalBody[finalBody.length - 1];
      if(lastNode.type === 'ExpressionStatement') {
        // Replace it with a return statement
        finalBody[finalBody.length - 1] = b.returnStatement(lastNode.expression);
      } else if(lastNode.type !== 'ReturnStatement') {
        // Not an expression or return statement, so append 'return undefined;'
        finalBody.push(
          b.returnStatement(b.identifier('undefined'))
        );
      }
    } else {
      // If the body is empty, add 'return undefined;'
      finalBody.push(
        b.returnStatement(b.identifier('undefined'))
      );
    }

    // Reconstruct the AST with the transformed body
    const transformedAST = b.program(finalBody);

    // Generate code from the transformed AST with Recast
    const result = this.jsl.env.recast.print(transformedAST, {
      sourceMapName: 'transformed.js.map',
    });

    // Wrap the code in an async IIFE to allow top-level await
    const transformedCode = `(async () => { ${result.code} })();`;

    if(config.DEBUG_TRANSFORMED_CODE) {
      obj.jsl._console.log(transformedCode);
      obj.jsl._console.log(result.map);
    }

    return { code: transformedCode, map: result.map };
  }
}

exports.PRDC_JSLAB_EVAL = PRDC_JSLAB_EVAL;