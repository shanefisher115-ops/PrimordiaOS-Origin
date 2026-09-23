/**
 * Runner Core for PrimordiaOS Multi-Tier E2E Test Suite.
 */

export class TestContext {
  constructor(name) {
    this.name = name;
  }
}

export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
  }

  test(name, fn, options = {}) {
    this.tests.push({
      name,
      fn,
      timeout: options.timeout || 15000,
      skip: options.skip || false
    });
  }

  beforeAll(fn) {
    this.beforeAllHooks.push(fn);
  }

  afterAll(fn) {
    this.afterAllHooks.push(fn);
  }

  beforeEach(fn) {
    this.beforeEachHooks.push(fn);
  }

  afterEach(fn) {
    this.afterEachHooks.push(fn);
  }

  async run(reporter) {
    reporter.onSuiteStart(this);

    let suiteSuccess = true;

    try {
      for (const hook of this.beforeAllHooks) {
        await hook();
      }
    } catch (err) {
      reporter.onSuiteError(this, "beforeAll", err);
      suiteSuccess = false;
      return { success: false, passed: 0, failed: this.tests.length, total: this.tests.length };
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const t of this.tests) {
      if (t.skip) {
        skipped++;
        reporter.onTestSkip(t);
        continue;
      }

      reporter.onTestStart(t);
      const startTime = Date.now();
      let testFailed = false;

      try {
        for (const hook of this.beforeEachHooks) {
          await hook();
        }

        // Run with timeout
        const testPromise = t.fn(new TestContext(t.name));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test timed out after ${t.timeout}ms`)), t.timeout)
        );

        await Promise.race([testPromise, timeoutPromise]);

        for (const hook of this.afterEachHooks) {
          await hook();
        }
      } catch (err) {
        testFailed = true;
        failed++;
        suiteSuccess = false;
        const duration = Date.now() - startTime;
        reporter.onTestFail(t, err, duration);
      }

      if (!testFailed) {
        passed++;
        const duration = Date.now() - startTime;
        reporter.onTestPass(t, duration);
      }
    }

    try {
      for (const hook of this.afterAllHooks) {
        await hook();
      }
    } catch (err) {
      reporter.onSuiteError(this, "afterAll", err);
      suiteSuccess = false;
    }

    reporter.onSuiteEnd(this, { passed, failed, skipped, total: this.tests.length });
    return { success: suiteSuccess && failed === 0, passed, failed, skipped, total: this.tests.length };
  }
}

export class ConsoleReporter {
  constructor() {
    this.suiteCount = 0;
    this.totalTests = 0;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.failures = [];
    this.startTime = Date.now();
  }

  onSuiteStart(suite) {
    this.suiteCount++;
    console.log(`\n📦 [SUITE ${this.suiteCount}] ${suite.name}`);
  }

  onSuiteEnd(suite, stats) {
    this.totalPassed += stats.passed;
    this.totalFailed += stats.failed;
    this.totalSkipped += stats.skipped;
    this.totalTests += stats.total;
  }

  onSuiteError(suite, hookName, error) {
    console.error(`  ❌ Suite Hook Error [${hookName}]: ${error.message}`);
    this.failures.push({
      suite: suite.name,
      test: `[${hookName} hook]`,
      error
    });
  }

  onTestStart(test) {
    // optional verbose
  }

  onTestPass(test, duration) {
    console.log(`  ✓ ${test.name} (${duration}ms)`);
  }

  onTestFail(test, error, duration) {
    console.error(`  ✗ ${test.name} (${duration}ms)`);
    console.error(`    Error: ${error.message}`);
    if (error.actual !== undefined || error.expected !== undefined) {
      console.error(`    Actual:   ${JSON.stringify(error.actual)}`);
      console.error(`    Expected: ${JSON.stringify(error.expected)}`);
    }
    this.failures.push({
      test: test.name,
      error,
      stack: error.stack
    });
  }

  onTestSkip(test) {
    console.log(`  - [SKIPPED] ${test.name}`);
  }

  summary() {
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(80));
    console.log("                      PRIMORDIAOS E2E TEST SUMMARY                      ");
    console.log("=".repeat(80));
    console.log(`Total Suites:   ${this.suiteCount}`);
    console.log(`Total Tests:    ${this.totalTests}`);
    console.log(`Passed:         ${this.totalPassed}`);
    console.log(`Failed:         ${this.totalFailed}`);
    console.log(`Skipped:        ${this.totalSkipped}`);
    console.log(`Duration:       ${totalDuration}s`);
    console.log("=".repeat(80));

    if (this.failures.length > 0) {
      console.error(`\n❌ FAILURES (${this.failures.length}):`);
      this.failures.forEach((f, idx) => {
        console.error(`\n[${idx + 1}] ${f.suite ? f.suite + " > " : ""}${f.test}`);
        console.error(`    ${f.error.message}`);
        if (f.stack) {
          const cleanStack = f.stack.split("\n").slice(0, 5).join("\n    ");
          console.error(`    ${cleanStack}`);
        }
      });
    } else {
      console.log(`\n✨ ALL ${this.totalPassed} E2E TESTS PASSED PERFECTLY! ✨\n`);
    }

    return {
      success: this.totalFailed === 0,
      total: this.totalTests,
      passed: this.totalPassed,
      failed: this.totalFailed,
      skipped: this.totalSkipped,
      duration: totalDuration
    };
  }
}
