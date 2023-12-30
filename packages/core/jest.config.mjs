import typoraPlugin from 'esbuild-plugin-typora'

const esbuildOptions = {
  plugins: [
    typoraPlugin(),
  ],
}

export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    "^.+\\.tsx?$": ["<rootDir>/jest-esbuild", esbuildOptions]
  }
}
