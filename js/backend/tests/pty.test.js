/**
 * @file JSLAB backend PTY tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function loadPtyClass(records) {
  var source = fs.readFileSync(path.join(__dirname, '..', 'pty.js'), 'utf8');
  var context = {
    module: { exports: {} },
    exports: null,
    Buffer: Buffer,
    require: function(module_path) {
      if(module_path === '@lydell/node-pty') {
        return {
          spawn: function() {
            var term = {
              pid: 111,
              _on_data: null,
              _on_exit: null,
              write: function(str) {
                records.writes.push(str);
              },
              resize: function(cols, rows) {
                records.resizes.push([cols, rows]);
              },
              kill: function() {
                records.kills += 1;
              },
              removeAllListeners: function() {}
            };
            term.onData = function(cb) { term._on_data = cb; };
            term.onExit = function(cb) { term._on_exit = cb; };
            records.terms.push(term);
            return term;
          }
        };
      }
      if(module_path === 'electron') {
        return {
          webContents: {
            fromId: function() {
              return {
                send: function(channel, payload) {
                  records.sent.push({ channel, payload });
                }
              };
            }
          }
        };
      }
      if(module_path === 'child_process') {
        return {
          execSync: function(cmd) {
            records.execs.push(cmd);
          }
        };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };
  context.exports = context.module.exports;
  vm.runInNewContext(source, context, { filename: 'pty.js' });
  return context.module.exports.PRDC_JSLAB_PTY;
}

tests.add('create/write/resize/list/kill lifecycle works with stubbed PTY', function(assert) {
  var records = { sent: [], writes: [], resizes: [], kills: 0, execs: [], terms: [] };
  var PRDC_JSLAB_PTY = loadPtyClass(records);
  var pty = new PRDC_JSLAB_PTY();

  var destroyed_handler = null;
  var sender = {
    id: 7,
    once: function(event, cb) {
      if(event === 'destroyed') {
        destroyed_handler = cb;
      }
    }
  };

  var id = pty.create({ sender: sender }, ['cmd', [], {}]);
  assert.equal(id, 1);
  assert.deepEqual(pty.listSessions(), [{ id: 1, pid: 111 }]);

  records.terms[0]._on_data('abc');
  assert.equal(records.sent[0].channel, 'pty');
  assert.equal(records.sent[0].payload.type, 'data');

  var encoded = Buffer.from('xyz', 'utf8').toString('base64');
  assert.equal(pty.write({}, { id: 1, buffer: encoded }), true);
  assert.equal(records.writes[0], 'xyz');
  assert.equal(pty.resize({}, { id: 1, cols: 80, rows: 24 }), true);
  assert.deepEqual(records.resizes[0], [80, 24]);

  records.terms[0]._on_exit({ exitCode: 0 });
  assert.equal(pty.listSessions().length, 0);

  var id2 = pty.create({ sender: sender }, ['cmd', [], {}]);
  assert.equal(id2, 2);
  destroyed_handler();
  assert.equal(pty.listSessions().length, 0);
  assert.equal(records.kills > 0, true);
}, { tags: ['unit', 'backend', 'pty'] });

tests.add('killAll terminates all tracked sessions and resets id counter', function(assert) {
  var records = { sent: [], writes: [], resizes: [], kills: 0, execs: [], terms: [] };
  var PRDC_JSLAB_PTY = loadPtyClass(records);
  var pty = new PRDC_JSLAB_PTY();
  var sender = { id: 8, once: function() {} };

  pty.create({ sender: sender }, ['a', [], {}]);
  pty.create({ sender: sender }, ['b', [], {}]);
  var killed = pty.killAll();
  assert.equal(killed, 2);
  assert.equal(pty.s_id, 0);
  assert.equal(pty.listSessions().length, 0);
  assert.equal(records.execs.length, 2);
}, { tags: ['unit', 'backend', 'pty'] });

exports.MODULE_TESTS = tests;

