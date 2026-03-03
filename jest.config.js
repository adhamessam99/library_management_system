module.exports = {
  // Use Node environment (not jsdom)
  testEnvironment: 'node',

  // Test timeout (default is 5s, increase for database operations)
  testTimeout: 10000,

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/server.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Verbose output
  verbose: true,

  // Show coverage after test run
  collectCoverage: true,
};
