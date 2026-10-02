/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
};
