/**
 * @file JSLAB MCP stdio server
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { PRDC_JSLAB_BRIDGE_CLIENT } = require('./bridge-client');

/**
 * Creates the JSLAB MCP server with explicit tool schemas and agent resources.
 * @param {Object} [options={}] Bridge client options.
 * @returns {Object} MCP server.
 */
function createServer(options = {}) {
  var client = new PRDC_JSLAB_BRIDGE_CLIENT(options);
  var app_root = path.resolve(__dirname, '..', '..');
  var version = JSON.parse(fs.readFileSync(path.join(app_root, 'package.json'), 'utf8')).version;
  var server = new McpServer({ name: 'jslab', version: version }, {
    instructions: 'JSLAB provides a persistent scientific JavaScript workspace. ' +
      'Read jslab://agent-guide before executing code. Start with get_session_status. ' +
      'A running execution continues after a tool returns; poll get_execution before submitting more work.'
  });
  var wait = z.number().int().min(0).max(10000).optional()
    .describe('Milliseconds to wait, up to 10000. Returning running does not stop execution.');
  var file = z.string().min(1).describe('Absolute local file path.');
  var cwd = z.string().min(1).optional().describe('Absolute working directory. Persists in the shared workspace.');
  var tools = [
    ['list_sessions', 'List live JSLAB sessions explicitly shared with --mcp.', {}, true],
    ['get_session_status', 'Get session identity, readiness, busy state and active execution ID.', {}, true],
    ['get_runtime_info', 'Read runtime versions, platform, working directory and configured JSLAB modules.',
      { wait_ms: wait }, true],
    ['get_execution', 'Get a retained execution result. The most recent 20 executions are retained.',
      { execution_id: z.string().uuid(), wait_ms: wait }, true],
    ['interrupt_execution', 'Interrupt JavaScript without checkpoints and clean up registered resources. Poll status to confirm completion.', {}, false],
    ['get_debug_state', 'Read debugger state, paused call stack and scope object handles.', {}, true],
    ['pause_execution', 'Pause JavaScript for stack and variable inspection.', {}, false],
    ['resume_execution', 'Continue or step through paused execution.',
      { action: z.enum(['continue', 'stepInto', 'stepOver', 'stepOut']).optional() }, false],
    ['inspect_debug_object', 'Read paused scope or object properties without invoking accessors.',
      { object_id: z.string().min(1) }, true],
    ['evaluate_debug_expression', 'Evaluate an expression in a paused frame; side effects require explicit opt-in.',
      { expression: z.string().max(16000), frame_index: z.number().int().nonnegative().optional(),
        allow_side_effects: z.boolean().optional() }, false],
    ['set_breakpoint', 'Set a breakpoint at a one-based line in an original .jsl script.',
      { path: file, line: z.number().int().positive(), condition: z.string().max(16000).optional(), enabled: z.boolean().optional() }, false],
    ['remove_breakpoint', 'Remove a previously configured breakpoint.',
      { id: z.string().min(1) }, false],
    ['clear_breakpoints', 'Clear line breakpoints and exception stops.', {}, false],
    ['set_exception_pause', 'Pause on no exceptions, exceptions uncaught by user code, or all exceptions.',
      { state: z.enum(['none', 'uncaught', 'all']) }, false],
    ['select_debug_target', 'Select a paused worker session, or omit session_id for the main sandbox.',
      { session_id: z.string().optional() }, false],
    ['update_debug_script', 'Validate or apply a live edit to a registered source while paused. Active-frame editing requires explicit opt-in.',
      { path: file, code: z.string().max(512000).optional(), dry_run: z.boolean().optional(), allow_top_frame_editing: z.boolean().optional() }, false],
    ['restart_debug_frame', 'Restart a paused frame; preceding side effects may run again.',
      { frame_index: z.number().int().nonnegative().optional() }, false],
    ['evaluate_code', 'Run JavaScript in the persistent JSLAB workspace and return output, errors and a value preview.',
      { code: z.string().max(512000), cwd: cwd, wait_ms: wait }, false],
    ['run_file', 'Run a .jsl script in the shared workspace. Relative data paths use cwd, when supplied.',
      { path: file, cwd: cwd, wait_ms: wait }, false],
    ['run_test_file', 'Run a .jsl test script. Tests must throw or assert on failure. Returns captured output and errors.',
      { path: file, cwd: cwd, wait_ms: wait }, false],
    ['check_code', 'Analyze a file with ESLint without executing it. Returns syntax errors and selected correctness warnings.',
      { path: file, wait_ms: wait }, true],
    ['list_workspace', 'List up to 1000 user variables with their JavaScript types and class names.',
      { wait_ms: wait }, true],
    ['read_variable', 'Read a bounded preview of a user variable without invoking accessors.',
      { name: z.string().min(1), wait_ms: wait }, true],
    ['list_figures', 'List open figure IDs and the active figure.', { wait_ms: wait }, true],
    ['export_figure', 'Export a figure to a file. PNG, JPEG and WebP exports up to 4 MiB are also returned as MCP images.',
      { figure_id: z.number().int().nonnegative(), path: file, wait_ms: wait }, false],
    ['get_help', 'Read JSLAB documentation for a function, lib.function or category.',
      { name: z.string().min(1), type: z.enum(['category']).optional(), wait_ms: wait }, true]
  ];
  tools.forEach(function(tool) {
    server.registerTool(tool[0], { description: tool[1], inputSchema: tool[2],
      annotations: { readOnlyHint: tool[3], openWorldHint: !tool[3] } }, async function(args) {
      try {
        var result = await client.call(tool[0], args);
        var failed = result.result && result.result.success === false;
        var content = [{ type: 'text', text: JSON.stringify(result) }];
        var value = !failed && result.result && result.result.value;
        if(value && ['image/png', 'image/jpeg', 'image/webp'].includes(value.mime_type)) {
          if(fs.statSync(value.path).size <= 4 * 1024 * 1024) {
            content.push({ type: 'image', mimeType: value.mime_type,
              data: fs.readFileSync(value.path).toString('base64') });
          }
        }
        return { content: content, isError: !!failed };
      } catch(err) {
        return { content: [{ type: 'text', text: err.message }], isError: true };
      }
    });
  });
  [['agent-guide', 'jslab://agent-guide', 'AGENTS.md'],
    ['mcp-guide', 'jslab://mcp-guide', 'docs/documentation.md']].forEach(function(resource) {
    server.registerResource(resource[0], resource[1], { mimeType: 'text/markdown' }, async function(uri) {
      var text = fs.readFileSync(path.join(app_root, resource[2]), 'utf8');
      if(resource[0] === 'mcp-guide') {
        text = text.replace(/\r\n/g, '\n');
        var start = text.indexOf('\n## MCP server\n');
        var end = text.indexOf('\n## ', start + 1);
        if(start < 0) throw new Error('MCP documentation section was not found.');
        text = text.slice(start + 1, end < 0 ? undefined : end).trim();
      }
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown',
        text: text }] };
    });
  });
  return server;
}

/**
 * Parses session selection arguments for the stdio entry point.
 * @param {Array<string>} args Command-line arguments.
 * @returns {Object} Bridge options.
 */
function parseArguments(args) {
  var options = {};
  for(var i = 0; i < args.length; i++) {
    var arg = args[i];
    if(arg === '--session-file' && args[i + 1]) options.session_file = path.resolve(args[++i]);
    else if(arg === '--pid' && /^[1-9]\d*$/.test(args[i + 1] || '')) options.pid = Number(args[++i]);
    else throw new Error('Usage: node js/mcp/server.js [--pid <desktop-pid> | --session-file <path>]');
  }
  if(options.session_file && options.pid) throw new Error('Choose --pid or --session-file.');
  return options;
}

if(require.main === module) {
  Promise.resolve().then(function() {
    return createServer(parseArguments(process.argv.slice(2))).connect(new StdioServerTransport());
  }).catch(function(err) {
    console.error('[jslab-mcp] ' + err.message);
    process.exitCode = 1;
  });
}

exports.createServer = createServer;
exports.parseArguments = parseArguments;
