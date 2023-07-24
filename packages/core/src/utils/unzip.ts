import * as yauzl from 'yauzl'
import * as fs from 'fs'
import * as path from 'path'


export function unzipFromBuffer(buffer: Buffer, dest: string) {
  return new Promise((resolve, reject) => {
    const opts = { autoClose: true, lazyEntries: true }

    yauzl.fromBuffer(buffer, opts, (err, zipfile) => {
      if (err) return reject(err)

      zipfile
        .on('entry', (entry) => {
          const filepath = path.join(dest, entry.fileName)
          if (entry.fileName.endsWith('/')) {
            fs.mkdirSync(filepath, { recursive: true })
          }
          else {
            zipfile.openReadStream(entry, (err, stream) => {
              if (err) return reject(err)

              stream.pipe(fs.createWriteStream(filepath))
                .on('close', () => zipfile.readEntry())
            })
          }
        })
        .on('end', resolve)
        .readEntry()
    })
  })
}
