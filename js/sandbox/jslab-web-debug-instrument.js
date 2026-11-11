/**
 * @file Automatic source checkpoints for the isolated browser worker debugger
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/** Adds synchronous checkpoints without changing function return conventions. */
function instrumentWebDebug(ast, recast, runtime_identifier, script) {
  const b = recast.types.builders;
  const function_ids = new WeakMap();
  const function_sources = new WeakMap();
  let sequence = 0;
  recast.types.visit(ast, {
    visitFunction(path) {
      if(path.node.loc) {
        function_ids.set(path.node, b.identifier('__jslab_frame_' + (++sequence) + '__'));
        function_sources.set(path.node, recast.print(path.node).code);
      }
      this.traverse(path);
    }
  });
  function frameId(path) {
    for(let parent = path.parentPath; parent; parent = parent.parentPath) {
      if(function_ids.has(parent.value)) return function_ids.get(parent.value);
    }
    return b.nullLiteral();
  }
  const receiver = () => b.memberExpression(b.memberExpression(b.memberExpression(
    b.identifier(runtime_identifier), b.identifier('inter')), b.identifier('execution')), b.identifier('web_debugger'));
  const call = (method, args) => b.callExpression(b.memberExpression(receiver(), b.identifier(method)), args);
  const evaluator = () => b.callExpression(b.arrowFunctionExpression([b.identifier('eval')],
    b.arrowFunctionExpression([b.identifier('__jslab_debug_expression__')],
      b.callExpression(b.identifier('eval'), [b.identifier('__jslab_debug_expression__')]))),
    [b.memberExpression(b.identifier(runtime_identifier), b.identifier('_eval'))]);
  function metadata(path, force = false, stop = false) {
    const names = new Set();
    for(let scope = path.scope; scope; scope = scope.parent) {
      for(const name of Object.keys(scope.getBindings())) {
        if(name !== runtime_identifier && !name.startsWith('__jslab_')) names.add(name);
      }
    }
    let caught = false;
    for(let parent = path; parent?.parentPath; parent = parent.parentPath) {
      if(/Function|Method/.test(parent.value?.type || '')) break;
      if(parent.name === 'block' && parent.parentPath.value?.type === 'TryStatement' && parent.parentPath.value.handler) caught = true;
    }
    const location = path.node.loc?.start || { line: 1, column: 0 };
    return { path: script, line: location.line, column: location.column + 1,
      end_line: path.node.loc?.end.line || location.line, names: Array.from(names), caught, force, stop };
  }
  function checkpoint(path, force = false, stop = false) {
    return b.expressionStatement(call('checkpoint', [b.stringLiteral(JSON.stringify(metadata(path, force, stop))), evaluator(), frameId(path)]));
  }
  function loop(path) {
    const point = checkpoint(path);
    this.traverse(path);
    const body = path.node.body;
    if(body.type === 'BlockStatement') body.body.unshift(point);
    else path.node.body = b.blockStatement([point, body]);
    return false;
  }
  recast.types.visit(ast, {
    visitCatchClause(path) {
      this.traverse(path);
      if(path.node.param?.type === 'Identifier') path.node.body.body.unshift(
        b.expressionStatement(call('caught', [path.node.param])));
      return false;
    },
    visitThrowStatement(path) {
      const data = metadata(path);
      this.traverse(path);
      path.node.argument = call('raise', [path.node.argument, b.stringLiteral(JSON.stringify(data)), evaluator(), frameId(path)]);
      return false;
    },
    visitForStatement: loop, visitWhileStatement: loop, visitDoWhileStatement: loop,
    visitForInStatement: loop, visitForOfStatement: loop,
    visitDebuggerStatement(path) { path.replace(checkpoint(path, true)); return false; },
    visitStatement(path) {
      const node = path.node;
      const alias = node.type === 'ExpressionStatement' && node.expression.type === 'Identifier' &&
        ['pause', 'debug', 'breakpoint', 'stoppoint', 'keyboard'].includes(node.expression.name) &&
        !path.scope.lookup(node.expression.name) ? node.expression.name : null;
      const point = checkpoint(path, !!alias, alias === 'stoppoint');
      this.traverse(path);
      if(alias) { path.replace(point); return false; }
      if(!node.loc || ['BlockStatement', 'EmptyStatement', 'LabeledStatement', 'FunctionDeclaration'].includes(node.type)) return false;
      if(node.type === 'VariableDeclaration' && ['init', 'left'].includes(path.name)) return false;
      if(Array.isArray(path.parentPath.value)) path.replace(point, node);
      else if(['consequent', 'alternate', 'body'].includes(path.name)) path.replace(b.blockStatement([point, node]));
      return false;
    }
  });
  // Retain real lexical closures for live functions, including synchronous callers.
  // Generated debugger closures have no source location and must not be wrapped.
  recast.types.visit(ast, {
    visitFunction(path) {
      if(!path.node.loc) return false;
      const data = metadata(path);
      this.traverse(path);
      const node = path.node;
      if(node.body.type !== 'BlockStatement') node.body = b.blockStatement([b.returnStatement(node.body)]);
      const body = node.body.body;
      const id = function_ids.get(node);
      const error = b.identifier(id.name.replace('frame', 'error'));
      const enter = b.expressionStatement(b.assignmentExpression('=', id,
        call('enter', [b.stringLiteral(JSON.stringify(data)), evaluator()])));
      const handler = b.catchClause(error, null, b.blockStatement([
        b.expressionStatement(call('exception', [error, id])), b.throwStatement(error)
      ]));
      node.body.body = [b.variableDeclaration('let', [b.variableDeclarator(id, b.nullLiteral())]),
        b.tryStatement(b.blockStatement([enter, ...body]), handler,
          b.blockStatement([b.expressionStatement(call('leave', [id]))]))];
    }
  });

  const registrations = new Map();
  recast.types.visit(ast, {
    visitFunction(path) {
      const source = function_sources.get(path.node);
      if(!source) return false;
      this.traverse(path);
      const node = path.node;
      if(node.type === 'FunctionDeclaration' && node.id && Array.isArray(path.parentPath.value)) {
        const list = path.parentPath.value;
        if(!registrations.has(list)) registrations.set(list, []);
        registrations.get(list).push(b.expressionStatement(call('rememberFunction', [b.identifier(node.id.name), b.stringLiteral(source)])));
      } else if(['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
        const parent = path.parentPath.value;
        const name = parent.type === 'VariableDeclarator' ? parent.id?.name : parent.type === 'ObjectProperty' ? parent.key?.name || parent.key?.value : '';
        path.replace(call('rememberFunction', [node, b.stringLiteral(source), b.stringLiteral(String(name || ''))]));
      }
      return false;
    }
  });
  for(const [list, statements] of registrations) list.unshift(...statements);

}

exports.instrumentWebDebug = instrumentWebDebug;
