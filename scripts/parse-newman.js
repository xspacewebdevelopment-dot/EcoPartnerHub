const fs = require('fs');
const r = JSON.parse(fs.readFileSync('postman/newman-results.json', 'utf8'));
const run = r.run;
const stats = run.stats;
const summary = {
  collection: r.collection.info.name,
  totalRequests: stats.requests.total,
  requestsFailed: stats.requests.failed,
  totalTests: stats.assertions.total,
  testsPassed: stats.assertions.total - stats.assertions.failed,
  testsFailed: stats.assertions.failed,
  totalTimeMs: run.timings.completed - run.timings.started,
  failures: run.failures.map(f => ({
    request: f.source && f.source.name,
    test: f.error && f.error.test,
    message: f.error && f.error.message
  })),
  executions: run.executions.map(e => ({
    name: e.item.name,
    status: e.response ? e.response.status : 'NO_RESPONSE',
    code: e.response ? e.response.code : null,
    responseTime: e.response ? e.response.responseTime : null,
    assertions: e.assertions ? e.assertions.map(a => ({
      test: a.assertion,
      passed: !a.error,
      error: a.error ? a.error.message : null
    })) : []
  }))
};
console.log(JSON.stringify(summary, null, 2));
