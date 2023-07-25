const fs = require('node:fs')
const archiver = require('archiver')
const packageInfo = require('./packages/core/package.json')


const output = fs.createWriteStream('typora-community-plugin.zip')

const archive = archiver('zip', { zlib: { level: 9 } })
  .on('error', (err) => { throw err })

archive.pipe(output)

archive
  .directory('packages/core/dist', packageInfo.version)
  .file('packages/loader/index.js', { name: 'loader.js' })
  .file('packages/installer/install.ps1', { name: 'install.ps1' })
  .append(`{"coreVersion":"${packageInfo.version}"}`, { name: 'loader.json' })

archive.finalize()
