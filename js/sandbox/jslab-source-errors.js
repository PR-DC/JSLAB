/**
 * @file JSLAB original-source error diagnostics
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/** Formats errors independently of the currently executing script. */
class PRDC_JSLAB_SOURCE_ERRORS {
  /** @param {Object} evaluator Evaluator owning generated source records. */
  constructor(evaluator) {
    this.evaluator = evaluator;
    this.objects = new WeakMap();
    this.primitives = new Map();
  }

  /**
   * Records an explicit throw without changing the thrown value or catch semantics.
   * @param {*} value Original thrown value.
   * @param {Object} location Original one-based source position.
   * @returns {*} The exact original value.
   */
  capture(value, location) {
    const table = value !== null && (typeof value === 'object' || typeof value === 'function') ? this.objects : this.primitives;
    table.set(value, location);
    if(table === this.primitives && table.size > 100) table.delete(table.keys().next().value);
    return value;
  }

  /** Adds location capture to throws and explicit Promise rejections, preserving their values. */
  instrument(ast, recast, runtime_identifier, script) {
    const b = recast.types.builders;
    const capture = (value, node) => b.callExpression(b.memberExpression(b.memberExpression(
      b.memberExpression(b.identifier(runtime_identifier), b.identifier('inter')),
      b.identifier('eval')), b.identifier('captureThrown')), [value,
      b.stringLiteral(script || 'jslcmdwindow'), b.numericLiteral(node.loc.start.line),
      b.numericLiteral(node.loc.start.column + 1)]);
    recast.types.visit(ast, {
      visitThrowStatement(path) {
        this.traverse(path);
        if(path.node.loc) path.node.argument = capture(path.node.argument, path.node);
        return false;
      },
      visitCallExpression(path) {
        this.traverse(path);
        const node = path.node;
        if(node.loc && node.callee.type === 'MemberExpression' && !node.callee.computed &&
            node.callee.object.type === 'Identifier' && node.callee.object.name === 'Promise' &&
            node.callee.property.name === 'reject') {
          node.arguments[0] = capture(node.arguments[0] || b.identifier('undefined'), node);
        }
        return false;
      }
    });
  }

  /** @param {string} line One V8/Firefox stack line. @returns {Object|null} Frame. */
  parseFrame(line) {
    let text = String(line).trim();
    let name = '';
    if(text.startsWith('at ')) {
      text = text.slice(3);
      const parenthesized = text.match(/^(.*?) \((.*)\)$/);
      if(parenthesized) { name = parenthesized[1]; text = parenthesized[2]; }
      else if(text.startsWith('async ')) { name = 'async'; text = text.slice(6); }
    } else {
      const separator = text.indexOf('@');
      if(separator >= 0) { name = text.slice(0, separator); text = text.slice(separator + 1); }
      else return null;
    }
    const match = text.match(/^(.*):(\d+):(\d+)$/);
    if(!match) return null;
    return { function_name: name, path: match[1], line: Number(match[2]), column: Number(match[3]) };
  }

  /** Maps a stack frame, preserving original paths and selected-line offsets. */
  async mapFrame(frame) {
    const source = this.evaluator.debug_sources.get(frame.path);
    if(!source) {
      try { return await this.evaluator.jsl?.inter?.env?.resolveModulePosition?.(frame) || frame; }
      catch(error) { return frame; }
    }
    try {
      const position = await this.evaluator.getOriginalPosition(source.map, frame.line, frame.column - 1);
      return Object.assign({}, frame, { path: source.path,
        line: position.line || frame.line, column: position.column == null ? frame.column : position.column + 1,
        mapped: position.line != null });
    } catch(error) {
      // A malformed map must never hide the original exception.
      return Object.assign({}, frame, { path: source.path, mapped: false });
    }
  }

  /**
   * Produces JSON-safe diagnostics for GUI, CLI, MCP and browser transports.
   * @param {*} error Error, frozen Error, primitive or object thrown by user code.
   * @param {Object} [fallback] Original script context when no stack is available.
   * @returns {Promise<Object>} Original-source error information.
   */
  async describe(error, fallback) {
    // Isolated runtimes already mapped these frames before copying the error.
    // Mapping their generated URLs against the parent would lose that origin.
    try {
      const details = error?.jslab_error_details;
      if(details && typeof details.name === 'string' && typeof details.message === 'string' &&
          Array.isArray(details.frames) && typeof details.stack === 'string') {
        return { name: details.name, message: details.message, kind: details.kind,
          location: details.location, frames: details.frames, stack: details.stack };
      }
    } catch(read_error) {}
    let name = 'Error';
    let message;
    let raw_stack = '';
    let explicit;
    try {
      if(error != null && (typeof error === 'object' || typeof error === 'function')) {
        name = typeof error.name === 'string' ? error.name : 'Error';
        message = typeof error.message === 'string' ? error.message : String(error);
        raw_stack = typeof error.stack === 'string' ? error.stack : '';
        explicit = error.jslab_location || this.objects.get(error);
      } else {
        name = 'ThrownValue';
        message = String(error);
        explicit = this.primitives.get(error);
      }
    } catch(read_error) { message = 'An uninspectable value was thrown.'; }
    const frames = [];
    const seen = new Set();
    for(const line of raw_stack.split(/\r?\n/).slice(0, 100)) {
      const parsed = this.parseFrame(line);
      if(!parsed) continue;
      const mapped = await this.mapFrame(parsed);
      if(!mapped.mapped && (/^node:/.test(mapped.path) || /[\\/]js[\\/]sandbox[\\/]/.test(mapped.path) ||
          /\/js\/(debug-worker|init-sandbox-frame|sandbox-worker)\.js$/.test(mapped.path))) continue;
      const key = mapped.path + ':' + mapped.line + ':' + mapped.column + ':' + mapped.function_name;
      if(seen.has(key)) continue;
      seen.add(key);
      frames.push(mapped);
    }
    // CommonJS syntax errors carry a source header and caret, not a user frame.
    if(name === 'SyntaxError' && !explicit) {
      const lines = raw_stack.split(/\r?\n/);
      const header = lines[0]?.match(/^(.*\.(?:[cm]?js|jsl)):(\d+)$/);
      if(header) {
        explicit = { path: header[1], line: Number(header[2]), column: Math.max(1, (lines[2] || '').indexOf('^') + 1) };
        // Electron can prepend its CommonJS wrapper to the first source line.
        // Parse the actual module text rather than returning that wrapper's column.
        const env = this.evaluator.jsl?.inter?.env;
        if(env?.babel_parser && typeof env.readFileSync === 'function') {
          try {
            const source = env.readFileSync(header[1], 'utf8');
            env.babel_parser.parse(String(source), { sourceType: 'unambiguous', allowReturnOutsideFunction: true });
          } catch(parse_error) {
            if(parse_error.loc) explicit = { path: header[1], line: parse_error.loc.line, column: parse_error.loc.column + 1 };
          }
        }
      }
    }
    const first_frame = frames[0] ? { path: frames[0].path, line: frames[0].line, column: frames[0].column } : null;
    const location = name === 'SyntaxError' || name === 'ThrownValue' ? explicit || first_frame || fallback || null :
      first_frame || explicit || fallback || null;
    if(location && !frames.some(frame => frame.path === location.path && frame.line === location.line)) {
      frames.unshift(Object.assign({ function_name: '' }, location));
    }
    const kind = name === 'SyntaxError' ? 'syntax' : name === 'JslabInterrupted' ? 'interrupted' : 'runtime';
    const title = name + ': ' + message;
    const stack = title + frames.map(frame => '\n  at ' + (frame.function_name ? frame.function_name + ' ' : '') +
      '(' + frame.path + ':' + frame.line + ':' + frame.column + ')').join('');
    return { name: name, message: message, kind: kind, location: location, frames: frames, stack: stack };
  }
}

exports.PRDC_JSLAB_SOURCE_ERRORS = PRDC_JSLAB_SOURCE_ERRORS;
