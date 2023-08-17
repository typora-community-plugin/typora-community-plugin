import * as yauzl from 'yauzl'
import * as fs from 'fs'
import * as path from 'path'
import * as mkdirp from 'mkdirp'


export function unzipFromBuffer(buffer: Buffer, dest: string) {
  return new Promise((resolve, reject) => {
    const opts = { autoClose: true, lazyEntries: true }

    yauzl.fromBuffer(buffer, opts, (err, zipfile) => {
      if (err) return reject(err)

      zipfile
        .on('entry', (entry) => {
          const { fileName } = entry
          const filepath = path.join(dest, fileName)

          if (fileName.endsWith('/')) {
            mkdirp.sync(filepath)
            zipfile.readEntry()
            return
          }

          if (fileName.includes('/')) {
            mkdirp.sync(path.dirname(filepath))
          }

          zipfile.openReadStream(entry, (err, stream) => {
            if (err) return reject(err)

            stream.pipe(fs.createWriteStream(filepath))
              .on('close', () => zipfile.readEntry())
          })
        })
        .on('end', resolve)
        .readEntry()
    })
  })
}
