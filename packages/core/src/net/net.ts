import type { ServerResponse } from 'node:http'
import { File, _options, reqnode } from 'typora'
import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { Shell } from 'src/io/shell'
import { noop, uniqueId } from "src/utils"
import { unzip } from 'src/common/zlib'
import { useService } from 'src/common/service'


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
    .then(() => checkFileExistence(tmpZippath))
    .then(() => unzip(tmpZippath, tmp))
    .then(() => fs.remove(tmpZippath))
    .then(() => tmp)
}

function download(url: string, dest: string) {
  if (File.isNode) {
    return downloadByNodejs(url, dest)
  }
  else {
    return Shell.run(`curl -fLsS '${url}' -o '${dest}'`)
  }
}

function downloadByNodejs(url: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const [module] = url.match(/^https?/)
    const net = reqnode(module)
    const fs = reqnode('fs')
    const file = fs.createWriteStream(dest)
    net
      .get(url, (response: ServerResponse) => {
        if (response.statusCode !== 200) {
          file.close()
          fs.unlink(dest, noop)

          const msg = `Request Failed. Status Code: ${response.statusCode}`
          reject(Error(msg))
          useService('notice', [msg])
          return
        }
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
      .on('error', (err: Error) => {
        file.close()
        fs.unlink(dest, noop)

        reject(err)
        useService('notice', [err.message])
      })
  })
}

function checkFileExistence(path: string) {
  return fs.access(path)
    .catch(() => {
      const i18n = useService('i18n')
      useService('notice', [i18n.t.net.fileDownloadFailed])
    })
}
