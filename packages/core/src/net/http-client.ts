import { File, JSBridge, _options, reqnode } from 'typora'
import fs from 'src/fs/filesystem'
import path from 'src/path'
import { Shell } from 'src/utils/shell'
import { uniqueId } from "src/utils/uniqueId"


export class HttpClient {
  /**
   * Download zip file and extract it into temporary folder.
   *
   * @returns Temporary folder full path
   */
  static downloadThenUnzipToTemp(url: string) {
    const tmpDir = path.join(_options.userDataPath, 'plugins', '_temp')
    const tmpDirname = uniqueId()
    const tmpFilename = `${tmpDirname}.zip`
    const tmpZippath = path.join(tmpDir, tmpFilename)
    const tmp = path.join(tmpDir, tmpDirname)

    if (File.isNode) {
      return fs.mkdir(tmpDir)
        .then(() => JSBridge.invoke('app.download', url, tmpDir, tmpFilename))
        .then(() => new Promise<void>((resolve, reject) => {
          const extract = reqnode('extract-zip') as typeof import('extract-zip')

          extract(tmpZippath, { dir: tmp }, (err) => {
            err ? reject(err) : resolve()
          })
        }))
        .then(() => fs.remove(tmpZippath))
        .then(() => tmp)
    }
    else {
      return fs.mkdir(tmpDir)
        .then(() => Shell.run(`curl -fLsS '${url}' -o '${tmpZippath}'`))
        .then(() => Shell.run(`unzip -o '${tmpZippath}' -d '${tmp}'`))
        .then(() => fs.remove(tmpZippath))
        .then(() => tmp)
    }
  }
}
