export default {
  // Test environment
  testEnvironment: "node",

  // Stop running tests after failures
  bail: true,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "./tests/coverage",

  // Coverage reporters
  coverageReporters: ["text", "lcov", "json-summary"],

  // Test match patterns
  testMatch: ["**/tests/**/*.test.js", "**/?(*.)+(spec|test).js"],

  // Babel-transform our code and ESM @dwtechs deps
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Transform ES modules from node_modules
  transformIgnorePatterns: ["/node_modules/(?!(@dwtechs)/)"],

  // @dwtechs/checkard's package.json omits "type": "module", so Jest's
  // native-ESM loader misdetects dist/ch.js (which uses `export {}`) as
  // CommonJS and fails to parse it. Force resolution to the real CJS build.
  moduleNameMapper: {
    "^@dwtechs/checkard$":
      "<rootDir>/node_modules/@dwtechs/checkard/dist/ch.cjs.js",
  },

  // Coverage settings
  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!**/node_modules/**"],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Jest 30 emits a "worker failed to exit gracefully" warning when a worker
  // exceeds the hard-coded 500 ms graceful shutdown deadline. With
  // `--experimental-vm-modules`, ESM module-graph teardown intermittently
  // exceeds that budget on child processes even in leak-free code. Using
  // worker threads instead avoids the fork/exit overhead and shuts down
  // well within the deadline.
  workerThreads: true,

  // `forceExit` covers the *main* Jest process: if for any reason the
  // top-level process still has pending async work after tests finish, exit
  // rather than hang.
  forceExit: true,
};
