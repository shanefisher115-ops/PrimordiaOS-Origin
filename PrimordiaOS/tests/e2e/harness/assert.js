/**
 * Custom Assertion Engine for PrimordiaOS Opaque-Box E2E Tests.
 * Provides deep equality, type checking, range validation, and clear error diagnostics.
 */

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

export const assert = {
  ok(value, message = "Expected value to be truthy") {
    if (!value) {
      throw new AssertionError(`${message} (Got: ${JSON.stringify(value)})`, value, true);
    }
  },

  equal(actual, expected, message) {
    if (actual !== expected) {
      const msg = message || `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`;
      throw new AssertionError(msg, actual, expected);
    }
  },

  notEqual(actual, expected, message) {
    if (actual === expected) {
      const msg = message || `Expected ${JSON.stringify(actual)} to NOT equal ${JSON.stringify(expected)}`;
      throw new AssertionError(msg, actual, expected);
    }
  },

  deepEqual(actual, expected, message) {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr !== expStr) {
      const msg = message || `Deep equality mismatch:\nActual:   ${actStr}\nExpected: ${expStr}`;
      throw new AssertionError(msg, actual, expected);
    }
  },

  isNumber(value, message = "Expected a valid number") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new AssertionError(`${message} (Got: ${typeof value} ${value})`, value, "number");
    }
  },

  isString(value, message = "Expected a string") {
    if (typeof value !== "string") {
      throw new AssertionError(`${message} (Got: ${typeof value})`, value, "string");
    }
  },

  isBoolean(value, message = "Expected a boolean") {
    if (typeof value !== "boolean") {
      throw new AssertionError(`${message} (Got: ${typeof value})`, value, "boolean");
    }
  },

  isObject(value, message = "Expected an object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new AssertionError(`${message} (Got: ${value === null ? "null" : Array.isArray(value) ? "array" : typeof value})`, value, "object");
    }
  },

  isArray(value, message = "Expected an array") {
    if (!Array.isArray(value)) {
      throw new AssertionError(`${message} (Got: ${typeof value})`, value, "array");
    }
  },

  includes(container, item, message) {
    if (typeof container === "string" || Array.isArray(container)) {
      if (!container.includes(item)) {
        const msg = message || `Expected ${JSON.stringify(container)} to include ${JSON.stringify(item)}`;
        throw new AssertionError(msg, container, item);
      }
    } else {
      throw new AssertionError(`Expected string or array for includes check, got ${typeof container}`, container, item);
    }
  },

  matches(value, regex, message) {
    if (typeof value !== "string" || !regex.test(value)) {
      const msg = message || `Expected string "${value}" to match regex ${regex}`;
      throw new AssertionError(msg, value, regex.toString());
    }
  },

  greaterThan(actual, min, message) {
    if (typeof actual !== "number" || actual <= min) {
      const msg = message || `Expected ${actual} to be strictly greater than ${min}`;
      throw new AssertionError(msg, actual, min);
    }
  },

  greaterThanOrEqual(actual, min, message) {
    if (typeof actual !== "number" || actual < min) {
      const msg = message || `Expected ${actual} to be >= ${min}`;
      throw new AssertionError(msg, actual, min);
    }
  },

  lessThan(actual, max, message) {
    if (typeof actual !== "number" || actual >= max) {
      const msg = message || `Expected ${actual} to be strictly less than ${max}`;
      throw new AssertionError(msg, actual, max);
    }
  },

  lessThanOrEqual(actual, max, message) {
    if (typeof actual !== "number" || actual > max) {
      const msg = message || `Expected ${actual} to be <= ${max}`;
      throw new AssertionError(msg, actual, max);
    }
  },

  async throws(asyncFn, expectedErrorMatch, message) {
    let threw = false;
    let error = null;
    try {
      await asyncFn();
    } catch (err) {
      threw = true;
      error = err;
    }
    if (!threw) {
      throw new AssertionError(message || "Expected function to throw an error, but it succeeded", null, "Error");
    }
    if (expectedErrorMatch) {
      const errMsg = error ? error.message || String(error) : "";
      if (typeof expectedErrorMatch === "string" && !errMsg.includes(expectedErrorMatch)) {
        throw new AssertionError(`Expected error to contain "${expectedErrorMatch}", got "${errMsg}"`, errMsg, expectedErrorMatch);
      } else if (expectedErrorMatch instanceof RegExp && !expectedErrorMatch.test(errMsg)) {
        throw new AssertionError(`Expected error to match ${expectedErrorMatch}, got "${errMsg}"`, errMsg, expectedErrorMatch.toString());
      }
    }
  }
};
