import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['index.ts'],
  outfile: 'index.js',
  minify: true,
})
