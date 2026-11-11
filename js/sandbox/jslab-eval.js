/**
 * @file JSLAB library eval
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { instrumentWebDebug } = require('./jslab-web-debug-instrument');
const { PRDC_JSLAB_SOURCE_ERRORS } = require('./jslab-source-errors');

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
    this.debug_sources = new Map();
    this.source_urls = new Map();
    this.source_errors = new PRDC_JSLAB_SOURCE_ERRORS(this);
    this.debug_script_sequence = 0;
    
    // Detached callbacks use the same formatter without finishing an unrelated command.
    this.jsl.context.addEventListener('unhandledrejection', function(event) {
      if(!event || !('reason' in event)) return;
      if(event.preventDefault) event.preventDefault();
      return obj.reportAsyncError(event.reason);
    });
    this.jsl.context.addEventListener('error', function(event) {
      if(!event) return;
      if(event.preventDefault) event.preventDefault();
      const error = 'error' in event ? event.error : new Error(event.message || 'Script error');
      return obj.reportAsyncError(error, event.filename ? {
        path: event.filename, line: event.lineno, column: event.colno
      } : undefined);
    });
  }

  /** Formats detached failures, including falsy and non-Error rejection reasons. */
  async reportAsyncError(error, fallback) {
    const execution = this.jsl.inter.execution;
    if(error?.name === 'JslabInterrupted' && execution?.web_debugger && !execution.web_debugger.active) {
      await execution.interrupt(null);
      execution.web_debugger.resetControl();
      (execution._send || globalThis.postMessage.bind(globalThis))({ type: 'debug-state', state: 'idle' });
      return;
    }
    execution?.web_debugger?.exception(error);
    const details = await this.source_errors.describe(error, fallback);
    execution?.onAsyncError?.(details);
    this.jsl.last_error_details = details;
    this.jsl.inter.env._formatting_error = true;
    this.jsl.inter.env._detached_error = true;
    try { this.jsl.inter.env.error(details.stack, false); }
    finally {
      this.jsl.inter.env._formatting_error = false;
      this.jsl.inter.env._detached_error = false;
    }
    return details;
  }

  /**
   * Handles code-evaluation errors and keeps UI state consistent.
   * @param {*} err Error object.
   * @returns {Promise<void>|undefined} Pending source error formatting, if needed.
   */
  async onEvalError(err) {
    this.jsl.inter.execution?.web_debugger?.exception(err);
    const details = await this.source_errors.describe(err, {
      path: this.jsl.current_script || this.jsl.jsl_file_name || 'jslcmdwindow', line: 1, column: 1
    });
    const execution = this.jsl.inter.execution;
    if(execution?.current) {
      execution.cancel(execution.current.id);
      details.cleanup_errors = await execution.cleanupResources();
    }
    this.jsl.last_error_details = details;
    this.jsl.inter.env._formatting_error = true;
    try { this.jsl.inter.env.error(details.stack, false); }
    finally { this.jsl.inter.env._formatting_error = false; }
    this.jsl.onEvaluated();
    return details;
  }

  /** Records a throw location without changing its value or catch semantics. */
  captureThrown(value, path, line, column) {
    return this.source_errors.capture(value, { path: path, line: line, column: column });
  }

  /**
   * Validates destructuring/assignment patterns against forbidden names.
   * @param {Object} pattern AST pattern node.
   * @param {Set<string>} forbidden_names Forbidden identifier names.
   * @param {Object} lang Language helper.
   */
  checkForbiddenPattern(pattern, forbidden_names, lang) {
    if(!pattern) {
      return;
    }
    if(pattern.type === 'Identifier') {
      if(forbidden_names.has(pattern.name)) {
        throw {
          name: 'JslabError',
          message: `${lang.string(185)}: '${pattern.name}' ${lang.string(184)}`,
        };
      }
      return;
    }
    if(pattern.type === 'ObjectPattern') {
      pattern.properties.forEach((prop) => {
        if(prop.type === 'RestElement') {
          this.checkForbiddenPattern(prop.argument, forbidden_names, lang);
        } else {
          this.checkForbiddenPattern(prop.value, forbidden_names, lang);
        }
      });
      return;
    }
    if(pattern.type === 'ArrayPattern') {
      pattern.elements.forEach((element) => {
        if(element) {
          this.checkForbiddenPattern(element, forbidden_names, lang);
        }
      });
      return;
    }
    if(pattern.type === 'RestElement') {
      this.checkForbiddenPattern(pattern.argument, forbidden_names, lang);
      return;
    }
    if(pattern.type === 'AssignmentPattern') {
      this.checkForbiddenPattern(pattern.left, forbidden_names, lang);
    }
  }

  /**
   * Builds runtime JSL identifier AST node.
   * @param {Object} b Recast builders.
   * @param {string} runtime_jsl_identifier Runtime identifier name.
   * @returns {Object}
   */
  makeRuntimeJslIdentifier(b, runtime_jsl_identifier) {
    return b.identifier(runtime_jsl_identifier);
  }

  /**
   * Builds runtime `jsl.context.<name>` member expression.
   * @param {Object} b Recast builders.
   * @param {string} runtime_jsl_identifier Runtime identifier name.
   * @param {string} name Member name.
   * @returns {Object}
   */
  makeRuntimeContextMember(b, runtime_jsl_identifier, name) {
    return b.memberExpression(
      b.memberExpression(this.makeRuntimeJslIdentifier(b, runtime_jsl_identifier), b.identifier('context')),
      b.identifier(name),
      false
    );
  }

  /**
   * Builds runtime `jsl.<name>` member expression.
   * @param {Object} b Recast builders.
   * @param {string} runtime_jsl_identifier Runtime identifier name.
   * @param {string} name Member name.
   * @returns {Object}
   */
  makeRuntimeJslMember(b, runtime_jsl_identifier, name) {
    return b.memberExpression(
      this.makeRuntimeJslIdentifier(b, runtime_jsl_identifier),
      b.identifier(name),
      false
    );
  }

  /**
   * Rewrites declaration pattern to assign into runtime context.
   * @param {Object} pattern AST pattern node.
   * @param {Object} b Recast builders.
   * @param {string} runtime_jsl_identifier Runtime identifier name.
   * @returns {Object}
   */
  transformPatternToContext(pattern, b, runtime_jsl_identifier) {
    if(pattern.type === 'Identifier') {
      return this.makeRuntimeContextMember(b, runtime_jsl_identifier, pattern.name);
    }
    // Destructuring patterns cannot be safely rewritten by replacing inner
    // identifiers with MemberExpression nodes because ast-types expects Pattern
    // nodes in those positions. Keep the original pattern and rewrite only
    // direct identifier assignment targets.
    return pattern;
  }

  /**
   * Rewrites the root object of a member expression through provided transform function.
   * @param {Object} member_expression AST member expression.
   * @param {Function} transform_pattern_to_context Pattern transformer.
   */
  rewriteMemberExpressionRoot(member_expression, transform_pattern_to_context) {
    let root = member_expression;
    while(root && root.object && root.object.type === 'MemberExpression') {
      root = root.object;
    }
    if(root && root.object && root.object.type === 'Identifier') {
      root.object = transform_pattern_to_context(root.object);
    }
  }
  
  /**
   * Evaluates a block of code as a string within the JSLAB environment.
   * @param {String} code The code block to evaluate.
   * @param {Boolean} [show_output=true] If true, displays the output of the code block.
   * @param {String} [jsl_file_name='jslcmdwindow'] The name of the file context for the code block.
   * @returns {Promise<Object>} Evaluation success, value or error.
   */
  async evalCodeFromMain(code, show_output = true, jsl_file_name = 'jslcmdwindow') {
    var obj = this;

    const execution = this.jsl.inter.execution;
    const token = this.jsl.onEvaluating();
    this.jsl.jsl_file_name = jsl_file_name;
    this.jsl.current_script =  jsl_file_name;
    
    this.source_codes = [];
    this.transformed_codes = [];
    this.source_maps = [];
    this.source_map_scripts = [];
    this.current_source_code = undefined;
    this.current_source_map = undefined;
    this.current_source_script = undefined;
    

    try {
      var data = await (execution ? execution.wait(this.evalString(code), token) : this.evalString(code));
      if(execution?.beforeComplete) await execution.wait(execution.beforeComplete(), token);
      if(execution && !execution.valid(token)) return { success: false, interrupted: true, error: "Execution interrupted." };
      if(this.jsl.inter.env._reported_error) {
        const details = await this.onEvalError(this.jsl.inter.env._reported_error);
        if(execution) execution.finish(token);
        return { success: false, error: details.stack, error_details: details };
      }
      if(obj.jsl.no_ans == false) {
        obj.jsl.context.ans = data;
      }
      if(show_output && obj.jsl.ignore_output == false) {
        obj.jsl.inter.env.showAns(this.jsl.inter.prettyPrint(data));
      }
      obj.jsl.onEvaluated();
      if(execution) execution.finish(token);
      return { success: true, value: data };
    } catch(err) {
      if(execution && !execution.valid(token)) return { success: false, interrupted: true, error: "Execution interrupted." };
      const details = await this.onEvalError(err);
      if(execution) execution.finish(token);
      return { success: false, error: details.stack, error_details: details };
    }
  }
  
  /**
   * Evaluates a string of code and handles errors and output.
   * @param {String} code The code string to evaluate.
   * @returns {*} The result of the evaluated code.
   */
  async evalString(code) { 
    const token = this.jsl.inter.execution?.current;
    var rewrite_result = this.rewriteCode(code);
    if(rewrite_result) {
      if(rewrite_result.debug_source && typeof this.jsl.inter.env.registerDebugSource === 'function') {
        await this.jsl.inter.env.registerDebugSource(rewrite_result.debug_source);
      }
      if(token && !this.jsl.inter.execution.valid(token)) throw new Error('Execution interrupted.');
      this.source_maps.push(rewrite_result.map);
      this.transformed_codes.push(rewrite_result.code);
      this.source_codes.push(code);
      this.source_map_scripts.push(this.jsl.current_script);
      
      var current_source_code = this.current_source_code;
      var current_source_map = this.current_source_map;
      var current_source_script = this.current_source_script;
      this.current_source_code = code;
      this.current_source_map = rewrite_result.map;
      this.current_source_script = this.jsl.current_script;

      try {
        return await this.jsl._eval(rewrite_result.code);
      } finally {
        if(!token || this.jsl.inter.execution.valid(token)) {
          this.current_source_code = current_source_code;
          this.current_source_map = current_source_map;
          this.current_source_script = current_source_script;
        }
      }
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
      var prev_script = this.jsl.current_script;
      var prev_file_name = this.jsl.jsl_file_name;
      this.jsl.current_script = script_path;
      this.jsl.jsl_file_name = this.jsl.inter.env.pathBaseName(script_path);
      
      try {
        var script_code = this.jsl.inter.env.readFileSync(script_path);
        if(script_code === false) {
          this.jsl.inter.env.error('@runScript: '+this.jsl.inter.lang.string(103)+': '+ script_path, false);
        } else {
          script_code = script_code.toString();
          if(lines !== undefined) {
            var code_lines = script_code.split('\n');
            if(typeof lines === 'number' && isFinite(lines)) {
              var line_number = Math.floor(lines);
              if(line_number >= 1 && code_lines.length >= line_number) {
                script_code = '\n'.repeat(line_number - 1) + code_lines[line_number - 1];
              } else {
                this.jsl.inter.env.error('@runScript: '+this.jsl.inter.lang.string(104)+'!\n '+this.jsl.inter.lang.string(105)+': '+ script_path, false);
                return false;
              }
            } else if(Array.isArray(lines) && lines.length >= 2) {
              var start_line = Math.floor(Number(lines[0]));
              var end_line = Math.floor(Number(lines[1]));
              if(Number.isFinite(start_line) &&
                Number.isFinite(end_line) &&
                start_line >= 1 &&
                end_line >= start_line &&
                code_lines.length >= end_line) {
                script_code = '\n'.repeat(start_line - 1) + code_lines.slice(start_line - 1, end_line).join('\n');
              } else {
                this.jsl.inter.env.error('@runScript: '+this.jsl.inter.lang.string(104)+'!\n '+this.jsl.inter.lang.string(105)+': '+ script_path);
                return false;
              }
            } else {
              var invalid_lines_msg = this.jsl.inter.lang.string(502);
              this.jsl.inter.env.error('@runScript: ' + invalid_lines_msg, false);
              return false;
            }
          }
          return await this.evalString(script_code, !silent);
        }
      } finally {
        this.jsl.current_script = prev_script;
        this.jsl.jsl_file_name = prev_file_name;
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
      cmd = 'run(' + JSON.stringify(this.jsl.last_script_path) + ', ' + JSON.stringify(this.jsl.last_script_lines) + ', undefined, true)';
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
    const text = String(stack);
    const heading = text.split(/\r?\n/)[0];
    const error = { name: heading.includes(':') ? heading.slice(0, heading.indexOf(':')) : 'Error',
      message: heading.includes(':') ? heading.slice(heading.indexOf(':') + 1).trim() : heading, stack: text };
    const details = await this.source_errors.describe(error);
    if(on_rewrite) throw Object.assign(new Error(details.stack), { jslab_error_details: details });
    this.jsl.inter.env.error(details.stack, false);
    return details;
  }

  /** Resolves the nearest user-source location in the current stack. */
  async getExpressionPosition() {
    const details = await this.source_errors.describe(new Error());
    return [details.location?.line, details.location?.column, details.location?.path];
  }

  /**
   * Retrieves the original source position from a source map.
   * @param {Object} map - The source map object.
   * @param {number} line - The line number in the generated code.
   * @param {number} column - The column number in the generated code.
   * @returns {Promise<Object>} An object containing the original source position, including source file, line, and column.
   */
  async getOriginalPosition(map, line, column) {
    const consumer = await new this.jsl.inter.env.SourceMapConsumer(map);
    try {
      let position = consumer.originalPositionFor({ line, column });
      if(position.line == null) position = consumer.originalPositionFor({ line, column, bias: 2 });
      return position;
    } finally { consumer.destroy(); }
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
  
  /** Replaces only top-level function declarations; active browser frames keep their old code. */
  _applyFunctionEdits(code, path, dry_run = false) {
    const ast = this.jsl.inter.env.babel_parser.parse(code, { sourceType: 'module' });
    const edits = [];
    const characters = code.split('');
    for(const node of ast.program.body) {
      const function_declaration = node.type === 'FunctionDeclaration';
      const function_variables = node.type === 'VariableDeclaration' && node.declarations.every(declaration =>
        declaration.id.type === 'Identifier' && ['FunctionExpression', 'ArrowFunctionExpression'].includes(declaration.init?.type));
      if(function_declaration || function_variables) edits.push(...(function_declaration ? [node.id.name] : node.declarations.map(declaration => declaration.id.name)));
      else for(let index = node.start; index < node.end; index++) if(characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
    }
    if(!edits.length) throw Error('Browser live editing requires top-level function declarations or function variables.');
    const old_path = this.jsl.current_script;
    const debugger_runtime = this.jsl.inter.execution.web_debugger;
    const enabled = debugger_runtime.enabled;
    try {
      this.jsl.current_script = path;
      const rewritten = this.rewriteCode(characters.join(''));
      if(dry_run) return { applied: false, status: 'Validated', functions: edits };
      debugger_runtime.enabled = false;
      this.jsl._eval(rewritten.code.replace('(async () => {', '(() => {'));
      return { applied: true, status: 'AppliedToFutureCalls', functions: edits, active_frames_unchanged: true };
    } finally { this.jsl.current_script = old_path; debugger_runtime.enabled = enabled; }
  }

  /**
   * Rewrites a string of code using Recast and Babel Parser.
   * @param {String} code The code string to evaluate.
   * @returns {String} The rewritten code.
   */
  rewriteCode(code) {
    const obj = this;
    const cfg = this.jsl.inter.config;
    const lang = this.jsl.inter.lang;
    const runtimeJslIdentifier = this.jsl.internal_jsl_identifier || 'jsl';
    const forbiddenNames = new Set([runtimeJslIdentifier]);

    // Prefer an object expression when valid, without adding a source column.
    const object_candidate = /^\s*\{/.test(code) && /\}\s*$/.test(code);

    if(cfg.DEBUG_PRE_TRANSFORMED_CODE) {
      obj.jsl._console.log(code);
    }

    // Parse the code into an AST using Recast with Babel parser
    let ast;
    try {
      ast = this.jsl.inter.env.recast.parse(code, {
        parser: {
          parse(source) {
            const options = { sourceType: 'module', plugins: ['jsx', 'typescript',
              'classProperties', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator'] };
            if(object_candidate) {
              try {
                const expression = obj.jsl.inter.env.babel_parser.parseExpression(source, options);
                if(expression.type === 'ObjectExpression') {
                  const b = obj.jsl.inter.env.recast.types.builders;
                  const statement = b.expressionStatement(expression);
                  statement.loc = expression.loc;
                  const program = b.program([statement]);
                  program.loc = expression.loc;
                  const file = b.file(program);
                  file.loc = expression.loc;
                  return file;
                }
              } catch(error) { /* A valid block must still parse as a normal script. */ }
            }
            return obj.jsl.inter.env.babel_parser.parse(source, options);
          },
        },
        sourceFileName: "source.js"
      });
    } catch(err) {
      const error = new SyntaxError(String(err.message));
      error.jslab_location = { path: this.jsl.current_script,
        line: err.loc?.line || 1, column: (err.loc?.column || 0) + 1 };
      throw error;
    }

    this.jsl.inter.env.recast.types.visit(ast, {
      visitNode(path) {
        if(/^(TS|JSX|Export)/.test(path.node.type)) {
          const error = new SyntaxError('Unsupported JavaScript syntax: ' + path.node.type);
          error.jslab_location = { path: obj.jsl.current_script,
            line: path.node.loc?.start.line || 1, column: (path.node.loc?.start.column || 0) + 1 };
          throw error;
        }
        this.traverse(path);
      }
    });
    if(this.jsl.inter.execution?.web_debugger?.enabled) {
      instrumentWebDebug(ast, this.jsl.inter.env.recast, runtimeJslIdentifier, this.jsl.current_script);
    }
    this.source_errors.instrument(ast, this.jsl.inter.env.recast, runtimeJslIdentifier, this.jsl.current_script);

    const checkPattern = (pattern) => {
      obj.checkForbiddenPattern(pattern, forbiddenNames, lang);
    };

    // Traverse the AST to check for forbidden names
    this.jsl.inter.env.recast.types.visit(ast, {
      visitVariableDeclarator(path) {
        checkPattern(path.node.id);
        this.traverse(path);
      },
      visitFunctionDeclaration(path) {
        const node = path.node;
        if(node.id && forbiddenNames.has(node.id.name)) {
          throw {
            name: 'JslabError',
            message: `${lang.string(186)}: '${node.id.name}' ${lang.string(184)}`,
          };
        }
        this.traverse(path);
      },
      visitClassDeclaration(path) {
        const node = path.node;
        if(node.id && forbiddenNames.has(node.id.name)) {
          throw {
            name: 'JslabError',
            message: `${lang.string(187)}: '${node.id.name}' ${lang.string(184)}`,
          };
        }
        this.traverse(path);
      },
      visitImportDeclaration(path) {
        path.node.specifiers.forEach((specifier) => {
          if(forbiddenNames.has(specifier.local.name)) {
            throw {
              name: 'JslabError',
              message: `${lang.string(188)}: '${specifier.local.name}' ${lang.string(184)}`,
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

    const b = this.jsl.inter.env.recast.types.builders;
    const makeRuntimeContextMember = (name) =>
      obj.makeRuntimeContextMember(b, runtimeJslIdentifier, name);
    const makeRuntimeJslMember = (name) =>
      obj.makeRuntimeJslMember(b, runtimeJslIdentifier, name);
    const transformPatternToContext = (pattern) =>
      obj.transformPatternToContext(pattern, b, runtimeJslIdentifier);

    let tempVarCounter = 0;
    let functionDepth = 0;

    // Helpers to track function-like scopes
    function enterFunctionScope() {
      functionDepth++;
    }
    function leaveFunctionScope() {
      functionDepth--;
    }

    const rewriteMemberExpressionRoot = (memberExpression) =>
      obj.rewriteMemberExpressionRoot(memberExpression, transformPatternToContext);

    // Track block-scoped bindings that must stay local (e.g., non-rewritten let/const).
    const lexicalBindingsByNode = new WeakMap();

    function collectPatternIdentifiers(pattern, out) {
      if(!pattern) {
        return;
      }

      if(pattern.type === 'Identifier') {
        out.push(pattern.name);
        return;
      }

      if(pattern.type === 'RestElement') {
        collectPatternIdentifiers(pattern.argument, out);
        return;
      }

      if(pattern.type === 'AssignmentPattern') {
        collectPatternIdentifiers(pattern.left, out);
        return;
      }

      if(pattern.type === 'ArrayPattern') {
        pattern.elements.forEach((element) => {
          if(element) {
            collectPatternIdentifiers(element, out);
          }
        });
        return;
      }

      if(pattern.type === 'ObjectPattern') {
        pattern.properties.forEach((prop) => {
          if(prop.type === 'RestElement') {
            collectPatternIdentifiers(prop.argument, out);
          } else if(prop.value) {
            collectPatternIdentifiers(prop.value, out);
          }
        });
      }
    }

    function recordLexicalBinding(scopeNode, pattern) {
      if(!scopeNode || !pattern) {
        return;
      }

      const names = [];
      collectPatternIdentifiers(pattern, names);
      if(!names.length) {
        return;
      }

      let scopeBindings = lexicalBindingsByNode.get(scopeNode);
      if(!scopeBindings) {
        scopeBindings = new Set();
        lexicalBindingsByNode.set(scopeNode, scopeBindings);
      }
      names.forEach((name) => scopeBindings.add(name));
    }

    function isLexicallyBoundInAncestors(path, identifierName) {
      let currentPath = path;
      while(currentPath) {
        const scopeBindings = lexicalBindingsByNode.get(currentPath.node);
        if(scopeBindings && scopeBindings.has(identifierName)) {
          return true;
        }
        currentPath = currentPath.parentPath;
      }
      return false;
    }

    function getMemberExpressionRootIdentifierName(memberExpression) {
      let root = memberExpression;
      while(root && root.object && root.object.type === 'MemberExpression') {
        root = root.object;
      }
      if(root && root.object && root.object.type === 'Identifier') {
        return root.object.name;
      }
      return undefined;
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
              makeRuntimeContextMember(funcName),
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
              makeRuntimeContextMember(className),
              b.identifier(className)
            )
          );
          const registerClass = b.expressionStatement(
            b.callExpression(
              makeRuntimeJslMember('registerClassDefinition'),
              [b.stringLiteral(className), b.identifier(className)]
            )
          );
          path.insertAfter(registerClass);
          path.insertAfter(assignment);

          return false;
        } else {
          enterFunctionScope();
          this.traverse(path);
          leaveFunctionScope();
          return false;
        }
      },

      visitCatchClause(path) {
        const node = path.node;
        if(node && node.param) {
          // Catch parameters are always lexical to the catch block.
          recordLexicalBinding(node, node.param);
        }
        this.traverse(path);
        return false;
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
            throw new Error(lang.string(295));
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
          if(node.kind === 'let' || node.kind === 'const') {
            // Keep non-rewritten block-scoped declarations local.
            node.declarations.forEach((decl) => {
              recordLexicalBinding(parent, decl.id);
            });
          }
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
                const transformedLeft = makeRuntimeContextMember(element.name);
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
            
            // Preserve class definition source when class expression is assigned at top level.
            if(
              isTopLevel &&
              decl.id.type === 'Identifier' &&
              decl.init &&
              decl.init.type === 'ClassExpression'
            ) {
              newAssignments.push(
                b.expressionStatement(
                  b.callExpression(
                    makeRuntimeJslMember('registerClassDefinition'),
                    [b.stringLiteral(decl.id.name), transformedId]
                  )
                )
              );
            }
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

      visitAssignmentExpression(path) {
        const node = path.node;
        const isTopLevel = (functionDepth === 0);

        if(
          isTopLevel &&
          ['Identifier', 'ObjectPattern', 'ArrayPattern', 'RestElement', 'AssignmentPattern'].includes(node.left.type)
        ) {
          if(
            node.left.type === 'Identifier' &&
            isLexicallyBoundInAncestors(path, node.left.name)
          ) {
            // Keep assignments to local lexical bindings untouched.
          } else {
            node.left = transformPatternToContext(node.left);
          }
        } else if(isTopLevel && node.left.type === 'MemberExpression') {
          const rootIdentifier = getMemberExpressionRootIdentifierName(node.left);
          if(!rootIdentifier || !isLexicallyBoundInAncestors(path, rootIdentifier)) {
            rewriteMemberExpressionRoot(node.left);
          }
        }

        this.traverse(path);
        return false;
      },

      visitUpdateExpression(path) {
        const node = path.node;
        const isTopLevel = (functionDepth === 0);

        if(isTopLevel && node.argument.type === 'Identifier') {
          if(!isLexicallyBoundInAncestors(path, node.argument.name)) {
            node.argument = transformPatternToContext(node.argument);
          }
        } else if(isTopLevel && node.argument.type === 'MemberExpression') {
          const rootIdentifier = getMemberExpressionRootIdentifierName(node.argument);
          if(!rootIdentifier || !isLexicallyBoundInAncestors(path, rootIdentifier)) {
            rewriteMemberExpressionRoot(node.argument);
          }
        }

        this.traverse(path);
        return false;
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

          const left = makeRuntimeContextMember(specifier.local.name);

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

    this.jsl.inter.env.recast.types.visit(ast, visitObj);

    const catches = [];
    this.jsl.inter.env.recast.types.visit(ast, {
      visitTryStatement(path) {
        if(path.node.handler && path.node.block.loc) {
          const excluded = [];
          obj.jsl.inter.env.recast.types.visit(path.node.block, {
            visitFunction(inner) {
              if(inner.node.loc) excluded.push({ start: inner.node.loc.start, end: inner.node.loc.end });
              return false;
            }
          });
          catches.push({ start: path.node.block.loc.start, end: path.node.block.loc.end, excluded });
        }
        this.traverse(path);
      }
    });

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
    const result = this.jsl.inter.env.recast.print(transformedAST, {
      sourceMapName: 'transformed.js.map',
    });

    // Wrap the code in an async IIFE to allow top-level await
    const source_key = String(this.jsl.current_script) + '\0' + !!this.jsl.inter.execution?.web_debugger?.enabled + '\0' + code;
    const source_url = this.source_urls.get(source_key) || 'jslab://scripts/' + (++this.debug_script_sequence) + '.js';
    this.source_urls.set(source_key, source_url);
    const debug_map = Object.assign({}, result.map, { mappings: ';' + result.map.mappings });
    const original_path = String(this.jsl.current_script || 'jslcmdwindow').replace(/\\/g, '/');
    debug_map.sources = debug_map.sources.map(() => /^[a-z]:\//i.test(original_path) ? 'file:///' + original_path : original_path);
    const encoded_map = btoa(unescape(encodeURIComponent(JSON.stringify(debug_map))));
    const transformedCode = `(async () => {\n${result.code}\n})();\n//# sourceURL=${source_url}\n//# sourceMappingURL=data:application/json;base64,${encoded_map}`;
    this.debug_sources.set(source_url, { map: debug_map, path: this.jsl.current_script });


    if(cfg.DEBUG_TRANSFORMED_CODE) {
      obj.jsl._console.log(transformedCode);
      obj.jsl._console.log(result.map);
    }

    return { code: transformedCode, map: debug_map,
      debug_source: { url: source_url, path: this.jsl.current_script, map: debug_map, catches } };
  }
}

exports.PRDC_JSLAB_EVAL = PRDC_JSLAB_EVAL;
