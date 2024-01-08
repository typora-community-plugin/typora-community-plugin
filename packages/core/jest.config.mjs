export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    "^.+\\.tsx?$": "<rootDir>/jest-esbuild"
  }
}
