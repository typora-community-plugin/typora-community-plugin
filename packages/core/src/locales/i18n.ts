import path from 'src/path'
import { _options } from "typora"
import { coreDir } from 'src/common/constants'
import { registerService, useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import type { ReadonlyDeep } from 'src/utils/types'
import { memorize } from 'src/utils/function/memorize'
import * as Locale from './lang.en.json'


const logger = useService('logger', ['I18n'])


type I18nBaseOptions = {
  defaultLang?: string
  userLang?: string
}
type I18nFileOptions = I18nBaseOptions & {
  localePath: string
}
type I18nJsonOptions<T> = I18nBaseOptions & {
  resources: Record<string, T>
}
type I18nOptions<T> = I18nFileOptions | I18nJsonOptions<T>

const DEFALUT_OPTIONS: I18nBaseOptions = {
  defaultLang: 'en',
}


registerService('i18n', memorize(() => {
  const i18n = new I18n<typeof Locale>({
    localePath: path.join(coreDir(), 'locales'),
    userLang: useService('settings').get('displayLang'),
  })

  DEFALUT_OPTIONS.userLang = i18n.locale

  return i18n
}))

export class I18n<T> {

  locale: string

  private resources: T

  constructor(options: I18nOptions<T>) {
    const {
      defaultLang,
      userLang,
      localePath,
      resources,
    } = Object.assign({}, DEFALUT_OPTIONS, options) as Required<I18nBaseOptions> & Partial<I18nFileOptions & I18nJsonOptions<T>>

    const locale = (userLang ?? _options.appLocale ?? _options.locale).toLowerCase();
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
      try {
        const localePath = pathList[i]
        const localeText = fs.readTextSync(localePath)

        this.locale = localeList[i]
        this.resources = JSON.parse(localeText)
        return
      }
      catch (error) {
        logger.warn(`Failed to load locale file: lang.${localeList[i]}.json`)
        continue
      }
    }
  }
}
