/**
 * @file Dedicated worker bootstrap for the shared JSLAB web sandbox
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_JSLAB_WEB_RPC } = require('./rpc');
var { PRDC_JSLAB_WEB_SHARED_SANDBOX_SESSION } = require('./shared-sandbox-session');

var rpc = new PRDC_JSLAB_WEB_RPC(globalThis);
var sandbox = new PRDC_JSLAB_WEB_SHARED_SANDBOX_SESSION(rpc);

rpc.register('handshake', function() {
  return sandbox.handshake();
});

rpc.register('set-language', function(params) {
  sandbox.setLanguage(params && params.lang);
  return {
    ok: true,
    language: sandbox.lang.lang
  };
});

rpc.register('evaluate', async function(params) {
  var code = params && typeof params.code == 'string' ? params.code : '';
  var value = await sandbox.evaluate(code);
  return {
    ok: true,
    preview: sandbox.inter.prettyPrint(value),
    workspace: sandbox.snapshotWorkspace(),
    capabilities: sandbox.env.getCapabilities(),
    runtime_info: typeof sandbox.env.getRuntimeInfo == 'function'
      ? sandbox.env.getRuntimeInfo()
      : {}
  };
});
