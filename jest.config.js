/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/'],
  // uniwind ships untranspiled TypeScript; components get a passthrough mock in tests.
  moduleNameMapper: { '^uniwind$': '<rootDir>/test/mocks/uniwind.ts' },
};
