import * as esbuild from 'esbuild'
import typoraPlugin from 'esbuild-plugin-typora'

await esbuild.build({
  entryPoints: ['index.ts'],
  outfile: 'index.js',
  bundle: true,
  minify: true,
  define: {
    'process.env.CORE_NS': `"typora-plugin-core@v2"`,
  },
  plugins: [
    typoraPlugin(),
  ],
})
