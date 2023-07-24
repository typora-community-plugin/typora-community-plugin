const fs = require('node:fs')
const path = require('node:path')
const archiver = require('archiver')


const output = fs.createWriteStream(path.join(process.cwd(), '/typora-community-plugin.zip'))

const archive = archiver('zip', { zlib: { level: 9 } })
  .on('error', (err) => { throw err })

archive.pipe(output)

archive
  .directory('packages/core/dist', false)
  .file('packages/loader/index.js', { name: 'loader.js' })
  .file('packages/installer/install.ps1', { name: 'install.ps1' })

archive.finalize()
