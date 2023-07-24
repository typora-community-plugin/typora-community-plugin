# esbuild-plugin-typora

Build [Typora Community Plugin](https://github.com/typora-community-plugin/typora-community-plugin) with esbuild.


## Install

```sh
pnpm i -D @typora-community-plugin/esbuild-plugin-typora
```

## Usage

```javascript
import * as esbuild from 'esbuild'
import typoraPlugin from '@typora-community-plugin/esbuild-plugin-typora'

await esbuild.build({
  entryPoints: ['index.ts'],
  outfile: 'index.js',
  bundle: true,
  minify: true,
  plugins: [
    typoraPlugin(),
  ],
})
```
