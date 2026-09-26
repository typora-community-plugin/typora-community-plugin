import type { AppSettings } from "src/app"
import type { Component } from "src/common/component"
import { useService } from "src/common/service"
import type { Settings } from "./settings"
import type { DisposeFunc } from "src/utils/types"


export function useSettingEffect(
  key: Parameters<Settings<AppSettings>['get']>[0],
  handler: (value: any) => void,
): DisposeFunc {
  const settings = useService('settings')

  const initialValue = settings.get(key)
  if (initialValue != null) handler(initialValue)

  return settings.onChange(key as any, (_, value) => handler(value))
}

export function useSettingEffectedFeature(
  key: Parameters<Settings<AppSettings>['get']>[0],
  feature: Component,
): DisposeFunc {
  return useSettingEffect(key, (isEnabled: boolean) => {
    isEnabled ? feature.load() : feature.unload()
  })
}
