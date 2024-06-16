export default {
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    "^.+\\.tsx?$": "<rootDir>/jest-esbuild"
  }
}
