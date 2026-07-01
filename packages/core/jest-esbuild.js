import esbuild from 'esbuild'
import typoraPlugin from 'esbuild-plugin-typora'


const typora = typoraPlugin()

export default {
  async process(source, sourcePath, transformerConfig) {
    const { outputFiles } = await esbuild.build({
      target: "esnext",
      bundle: false,
      minify: false,
      sourcemap: true,
      entryPoints: [sourcePath],
      outdir: "dist",
      write: false,
      define: {
        'process.env.IS_PROD': 'false',
        'process.env.IS_DEV': 'false',
        'process.env.IS_TEST': 'true',
      },
      plugins: [
        typora,
      ],
    })

    const codeGlobalPrepend = `import{createRequire}from"module";globalThis.reqnode=globalThis.reqnode||(createRequire(import.meta.url));\n`

    return outputFiles.reduce((result, outputFile) => {
      const key = outputFile.path.endsWith(".map") ? "map" : "code"

      result[key] = key === 'code'
        ? codeGlobalPrepend + outputFile.text
        : outputFile.text

      return result
    }, {})
  },
}
