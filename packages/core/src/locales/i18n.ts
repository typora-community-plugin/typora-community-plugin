import * as fs from 'fs'
import * as path from 'path'
import { _options } from "typora"
import type { ReadonlyDeep } from 'src/utils/types'


type I18nBaseOptions = {
  defaultLang?: string
}
type I18nFileOptions = I18nBaseOptions & {
  localePath: string
}
type I18nJsonOptions<T> = I18nBaseOptions & {
  resources: Record<string, T>
}
type I18nOptions<T> = I18nFileOptions | I18nJsonOptions<T>

const DEFALUT_OPTIONS: I18nBaseOptions = {
  defaultLang: 'en'
}

export class I18n<T> {

  private locale: string
  private resources: T

  constructor(options: I18nOptions<T>) {
    const {
      defaultLang,
      localePath,
      resources,
    } = Object.assign({}, DEFALUT_OPTIONS, options) as Required<I18nBaseOptions> & Partial<I18nFileOptions & I18nJsonOptions<T>>

    const locale = _options.appLocale.toLowerCase();
    const localeList = [locale, locale.split('-').at(0)!, defaultLang]

    if (resources) {
      this.loadFormJson(localeList, resources)
      return
    }

    this.loadFormFile(localeList, localePath!)
  }

  get t(): ReadonlyDeep<T> {
    return this.resources
  }

  private loadFormJson(localeList: string[], resources: Record<string, T>) {
    this.locale = localeList.find(s => resources[s]) ?? ''
    this.resources = resources[this.locale]
  }

  private loadFormFile(localeList: string[], localePath: string) {
    const pathList = localeList
      .map(s => path.join(localePath, `lang.${s}.json`))

    for (let i = 0; i < pathList.length; i++) {
      const localePath = pathList[i]
      if (!fs.existsSync(localePath)) {
        continue
      }

      try {
        this.locale = localeList[i]
        this.resources = JSON.parse(fs.readFileSync(localePath, 'utf8'))
      }
      catch (error) {
        console.error('Failed to load locale data.')
      }
      return
    }
  }
}
