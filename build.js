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
  .file('packages/installer/README.md', { name: 'README.md' })
  .file('packages/installer/dist/install-linux.sh', { name: 'install-linux.sh' })
  .file('packages/installer/dist/install-macos.sh', { name: 'install-macos.sh' })
  .file('packages/installer/dist/install-windows.ps1', { name: 'install-windows.ps1' })
  .file('packages/installer/dist/uninstall-linux.sh', { name: 'uninstall-linux.sh' })
  .file('packages/installer/dist/uninstall-macos.sh', { name: 'uninstall-macos.sh' })
  .file('packages/installer/dist/uninstall-windows.ps1', { name: 'uninstall-windows.ps1' })
  .append(`{"coreVersion":"${packageInfo.version}","debug":false}`, { name: 'loader.json' })

archive.finalize()
