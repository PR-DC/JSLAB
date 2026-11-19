/**
 * @file Per-scenario cleanup and error reporting for GUI tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTER } = require('../other-shared/tester');

/**
 * Reports cleanup failures, renderer exceptions and Command Window errors with their scenario.
 */
class PRDC_JSLAB_GUI_TESTER extends PRDC_JSLAB_TESTER {

  /**
   * Connects the tester to its GUI clients and cleanup callbacks.
   * @param {string} folder Root directory containing test modules.
   * @param {Object} options Test discovery and reporting settings.
   * @param {Object} lifecycle Host-specific setup, teardown and error sources.
   */
  constructor(folder, options, lifecycle) {
    super(folder, options);
    this.lifecycle = lifecycle;
    this.command_window_errors_seen = 0;
  }

  /**
   * Fails the suite if an error arrived after its final scenario completed.
   */
  checkRemainingCommandErrors() {
    const messages = this.lifecycle.command_window?.command_window_errors.slice(this.command_window_errors_seen) || [];
    if(messages.length) throw Error('Command Window errors after the last scenario:\n' + messages.join('\n'));
  }

  /**
   * Runs one test and attributes GUI and Command Window errors to it.
   * @param {Object} test Registered test case.
   * @returns {Promise<Object>} Result after cleanup and error checks.
   */
  async _runSingleTest(test) {
    const errors = new Map(this.lifecycle.clients().map(client => [client, client.errors.length]));
    let result;
    try {
      await this.lifecycle.before?.(test);
      result = await super._runSingleTest(test);
    } catch(error) {
      result = { status: 'failed', error };
    }
    const failures = [];
    try {
      await this.lifecycle.after(test, result);
    } catch(error) {
      failures.push(error);
    }
    const exceptions = [...errors].flatMap(([client, index]) => client.errors.slice(index));
    if(exceptions.length) failures.push(Error(exceptions.map(error => error.exception?.description || error.text).join('\n')));
    const messages = this.lifecycle.command_window?.command_window_errors || [];
    const expected = [...(test.expected_command_errors || [])];
    for(const message of messages.slice(this.command_window_errors_seen)) {
      const match = expected.findIndex(pattern => pattern instanceof RegExp ? message.search(pattern) !== -1 : message === pattern);
      if(match === -1) failures.push(Error('Unexpected Command Window error:\n' + message));
      else expected.splice(match, 1);
    }
    this.command_window_errors_seen = messages.length;
    if(result.status === 'passed' && expected.length) {
      failures.push(Error('Missing expected Command Window errors:\n' + expected.join('\n')));
    }
    if(failures.length) {
      if(result.error) failures.unshift(result.error);
      const error = failures.length === 1 ? failures[0] : new AggregateError(failures, failures.map(error => error.message).join('\n'));
      return { ...result, status: 'failed', error };
    }
    return result;
  }
}

exports.PRDC_JSLAB_GUI_TESTER = PRDC_JSLAB_GUI_TESTER;
