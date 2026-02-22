/**
 * @file JSLAB networking submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_NETWORKING } = require('../networking');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createNetworking() {
  var mock_jsl = {
    inter: {
      env: {
        online: true,
        os: {
          networkInterfaces: function() {
            return {
              Ethernet: [
                { family: 'IPv4', internal: false, address: '192.168.1.10' },
                { family: 'IPv6', internal: false, address: 'fe80::1' }
              ]
            };
          }
        },
        net: {
          createConnection: function() {
            return {
              setTimeout: function() {},
              on: function() {},
              end: function() {},
              destroy: function() {}
            };
          }
        },
        tcpPortUsed: {
          check: async function() {
            return false;
          }
        }
      },
      exec: function() {},
      execSync: function() {
        return Buffer.from('Reply from 127.0.0.1');
      }
    }
  };
  return new PRDC_JSLAB_LIB_NETWORKING(mock_jsl);
}

tests.add('crc16xmodem matches known vector for "123456789"', function(assert) {
  var net = createNetworking();
  var bytes = Uint8Array.from(Buffer.from('123456789', 'ascii'));
  assert.equal(net.crc16xmodem(bytes), 0x31C3);
}, { tags: ['unit', 'networking'] });

tests.add('ip2dec converts IPv4 to decimal integer', function(assert) {
  var net = createNetworking();
  assert.equal(net.ip2dec('192.168.0.1'), 3232235521);
  assert.equal(net.ip2dec('10.0.0.1'), 167772161);
}, { tags: ['unit', 'networking'] });

tests.add('isOnline and getIP use environment values', function(assert) {
  var net = createNetworking();
  assert.equal(net.isOnline(), true);
  assert.equal(net.getIP(), '192.168.1.10');
}, { tags: ['unit', 'networking'] });

tests.add('pingAddressSync returns true on successful reply output', function(assert) {
  var net = createNetworking();
  assert.equal(net.pingAddressSync('127.0.0.1', 200), true);
}, { tags: ['unit', 'networking'] });

exports.MODULE_TESTS = tests;
