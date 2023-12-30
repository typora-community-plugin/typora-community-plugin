import esbuild from 'esbuild'


export default {
  async processAsync(source, sourcePath, { transformerConfig }) {
    const { outputFiles } = await esbuild.build({
      target: "esnext",
      ...transformerConfig,
      bundle: false,
      minify: false,
      sourcemap: true,
      entryPoints: [sourcePath],
      outdir: "dist",
      write: false,
    })

    return outputFiles.reduce((result, outputFile) => {
      const key = outputFile.path.endsWith(".map") ? "map" : "code"

      result[key] = outputFile.text

      return result
    }, {})
  },
}
