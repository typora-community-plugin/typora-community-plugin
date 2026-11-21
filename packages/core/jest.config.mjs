export default {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^typora$": "<rootDir>/__mocks__/typora.mjs",
    "\\.scss$": "<rootDir>/__mocks__/styleMock.mjs"
  },
  setupFilesAfterEnv: ["<rootDir>/src/setup-test-env.ts"],
  transformIgnorePatterns: [],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    "^.+\\.tsx?$": "<rootDir>/jest-esbuild"
  }
}
