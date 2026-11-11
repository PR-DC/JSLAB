/**
 * @file Paused-frame adapter for the existing Workspace and variable inspector
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const parser = require('@babel/parser');

/** Reads remote descriptors without transferring user objects or invoking getters. */
class PRDC_JSLAB_DEBUGGER_INSPECTOR {
  constructor(host) { this.host = host; }

  preview(value) {
    if(!value) return this.host.currentString(595);
    if(value.preview !== undefined && typeof value.preview === 'string') return value.preview;
    if(value.value !== undefined) return JSON.stringify(value.value);
    return value.unserializable_value || value.description || value.type || '';
  }

  rows(variables) {
    return (variables || []).map(item => [item.name, item.type || item.value?.type || '',
      item.accessor ? this.host.currentString(594) : this.preview(item.value || item)]);
  }

  /** Rejects stale asynchronous responses after frame selection, stepping or resume. */
  async request(method, args, token) {
    this.check(token);
    const result = await this.host.request(method, args);
    this.check(token);
    if(result?.success === false || result?.error) throw Error(result.error || this.host.currentString(595));
    return result;
  }

  check(token) {
    if(!token || token !== this.host.token()) throw Error(this.host.currentString(620));
  }

  /** Reuses the normal inspector model, with bounded descriptor rows and explicit edits. */
  async inspect(variable, options = {}) {
    if(!options || typeof options !== 'object' || Array.isArray(options)) options = {};
    const token = this.host.token();
    const evaluated = await this.request('evaluate_debug_expression', { expression: variable }, token);
    const value = evaluated.value;
    const label = id => this.host.currentString(id);
    const model = { variable, title: label(402), meta_parts: [], note_parts: [], debug_context: token };
    if(!value?.object_id) {
      model.content = { type: 'scalar', variable, view: 'scalar', edit_label: label(412),
        preview_text: this.preview(value), default_expr: this.preview(value) };
    } else {
      const response = await this.request('inspect_debug_object', { object_id: value.object_id }, token);
      let properties = response.properties || [];
      const filter = String(options.filter || '').toLowerCase();
      if(filter) properties = properties.filter(item => (item.name + ' ' + this.preview(item.value)).toLowerCase().includes(filter));
      if(options.sort_by) properties = properties.slice().sort((a, b) => {
        const key = options.sort_by === 'value' ? item => this.preview(item.value) : item => item.name;
        return key(a).localeCompare(key(b), undefined, { numeric: true }) * (options.sort_dir === 'desc' ? -1 : 1);
      });
      const limit = Math.min(1000, Math.max(1, Number(options.max_rows) || 200));
      const state = { variable, view: 'object', state_filter: options.filter || '',
        state_sort_by: options.sort_by || '', state_sort_dir: options.sort_dir || 'asc' };
      model.content = { ...state, type: 'table', edit_cell_title: label(420),
        toolbar: { ...state, allow_filter_expression: false, filter_label: label(392), clear_filter_label: label(393),
          show_clear_filter: !!filter, refresh_label: label(396), hint_label: label(397) },
        columns: [{ key: 'key', label: label(421) }, { key: 'value', label: label(422) }].map(column => ({
          ...column, sortable: true, next_sort_dir: options.sort_by === column.key && options.sort_dir !== 'desc' ? 'desc' : 'asc',
          indicator: options.sort_by === column.key ? options.sort_dir || 'asc' : ''
        })),
        rows: properties.slice(0, limit).map(item => ({ cells: [{ preview_text: item.name }, {
          preview_text: item.accessor ? label(594) : this.preview(item.value),
          editable: !item.accessor && item.writable !== false, path: [item.name], default_expr: this.preview(item.value)
        }] })) };
      if(response.truncated || properties.length > limit) model.note_parts.push(label(621));
    }
    this.check(token); this.host.showInspector(model);
    return model;
  }

  /** Parses only the application's generated inspector commands; never evaluates arguments. */
  async handle(command) {
    let program;
    try { program = parser.parse(command); } catch(error) { return false; }
    const literal = node => {
      if(['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node?.type)) return node.value;
      if(node?.type === 'NullLiteral') return null;
      if(node?.type === 'ArrayExpression') return node.elements.map(literal);
      if(node?.type === 'ObjectExpression') return Object.fromEntries(node.properties.map(property => {
        if(property.type !== 'ObjectProperty' || property.computed || property.method) throw Error('Invalid inspector argument.');
        return [property.key.name || property.key.value, literal(property.value)];
      }));
      throw Error('Invalid inspector argument.');
    };
    let calls;
    try {
      calls = program.program.body.filter(node => node.type !== 'EmptyStatement').map(node => {
        const call = node.type === 'ExpressionStatement' && node.expression;
        if(call?.type !== 'CallExpression' || !['inspectVariable', 'inspectSetVariable'].includes(call.callee.name)) throw Error();
        return { name: call.callee.name, args: call.arguments.map(literal) };
      });
    } catch(error) { return false; }
    if(!calls.length) return false;
    for(const { name, args } of calls) {
      if(typeof args[0] !== 'string' || !args[0].trim()) throw Error('Invalid inspector variable.');
      // Assignment roots must be valid expressions; trailing statements are forbidden.
      parser.parseExpression(args[0]);
      if(name === 'inspectVariable') await this.inspect(args[0], args[1] || {});
      else {
        if(!Array.isArray(args[1]) || args[1].some(key => !['string', 'number'].includes(typeof key)) || typeof args[2] !== 'string') throw Error('Invalid inspector edit.');
        const target = '(' + args[0] + ')' + args[1].map(key => '[' + JSON.stringify(key) + ']').join('');
        parser.parseExpression(args[2]);
        await this.request('evaluate_debug_expression', { expression: target + ' = (' + args[2] + ')', allow_side_effects: true }, this.host.token());
      }
    }
    return true;
  }
}
exports.PRDC_JSLAB_DEBUGGER_INSPECTOR = PRDC_JSLAB_DEBUGGER_INSPECTOR;
