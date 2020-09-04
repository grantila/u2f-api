module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/lib/**/*.spec.ts'],
  collectCoverageFrom: ['<rootDir>/lib/**/*.ts'],
  coverageReporters: ['lcov', 'text', 'html'],
};
