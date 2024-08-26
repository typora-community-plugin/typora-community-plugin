import { File, JSBridge, _options } from 'typora'
import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { Shell } from 'src/io/shell'
import { uniqueId } from "src/utils"
import { unzip } from 'src/common/zlib'


/**
 * Download zip file and extract it into temporary folder.
 *
 * @returns Temporary folder full path
 */
export function downloadThenUnzipToTemp(url: string) {
  const tmpDir = path.join(_options.userDataPath, 'plugins', '_temp')
  const tmpDirname = uniqueId()
  const tmpZippath = path.join(tmpDir, `${tmpDirname}.zip`)
  const tmp = path.join(tmpDir, tmpDirname)

  return fs.mkdir(tmpDir)
    .then(() => download(url, tmpZippath))
    .then(() => unzip(tmpZippath, tmp))
    .then(() => fs.remove(tmpZippath))
    .then(() => tmp)
}

function download(url: string, dest: string) {
  if (File.isNode) {
    const dir = path.dirname(dest)
    const file = path.basename(dest)
    return JSBridge.invoke('app.download', url, dir, file)
  }
  else {
    return Shell.run(`curl -fLsS '${url}' -o '${dest}'`)
  }
}
