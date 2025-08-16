import type { IncomingMessage } from 'node:http'
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

function downloadByNodejs(url: string, dest: string, maxRedirects = 5) {
  return new Promise<void>((resolve, reject) => {
    let isFinished = false
    const fs = reqnode('fs') as typeof import('fs')

    doRequest(url)

    function doRequest(currentUrl: string, redirectCount = 0) {
      const [module] = currentUrl.match(/^https?/)
      const net = reqnode(module)

      net
        .get(currentUrl, (response: IncomingMessage) => {

          if ([301, 302, 303, 307, 308].includes(response.statusCode || 0)) {
            if (redirectCount >= maxRedirects) {
              return throws(new Error('Too many redirects'))
            }
            const { location } = response.headers
            if (!location) {
              return throws(new Error('Redirect location header missing'));
            }
            const newUrl = new URL(location, currentUrl).toString()
            response.resume()
            return doRequest(newUrl, redirectCount + 1)
          }

          if (response.statusCode !== 200) {
            response.resume()
            return throws(new Error(`Request Failed. Status Code: ${response.statusCode}`))
          }

          const file = fs.createWriteStream(dest)
          response
            .pipe(file)
            .on('error', cleanUp)
          file
            .on('finish', () => file.close(() => resolve()))
            .on('error', cleanUp)

          function cleanUp(err: Error) {
            if (isFinished) return
            isFinished = true
            file.close(() => fs.unlink(dest, () => throws(err)))
          }
        })
        .on('error', throws)

      function throws(err: Error) {
        reject(err)
        useService('notice', [err.message])
      }
    }
  })
}

function checkFileExistence(path: string) {
  return fs.access(path)
    .catch(() => {
      const i18n = useService('i18n')
      useService('notice', [i18n.t.net.fileDownloadFailed])
    })
}
