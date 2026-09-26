const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Keep the transform cache on the project drive. The OS temp drive can fill up
  // (jest writes here on every run) and a full disk surfaces as confusing
  // "Exceeded timeout" / ENOSPC failures rather than a clear error.
  cacheDirectory: '<rootDir>/.jest-cache',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // .kilo/worktrees/* are full repo copies (git worktrees). Without this, the
  // testMatch globs collect every suite twice, and the copies resolve '@/' back
  // to <rootDir>/src — so a stale duplicate test can fail against current source.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.kilo/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
