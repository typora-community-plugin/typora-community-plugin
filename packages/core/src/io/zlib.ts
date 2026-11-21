import { Shell } from 'src/io/shell'
import { File, reqnode } from 'typora'


export function unzip(src: string, dest: string) {
  if (File.isNode) {
    return new Promise<void>((resolve, reject) => {
      const extract = reqnode('extract-zip') as typeof import('extract-zip')

      extract(src, { dir: dest }, (err) => {
        err ? reject(err) : resolve()
      })
    })
  }
  else {
    return Shell.run(`unzip -o '${src}' -d '${dest}'`)
  }
}
