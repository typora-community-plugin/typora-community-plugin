const platformStr = (window?.process?.platform as 'win32' | 'linux') ?? 'darwin'

export function platform() {
  return platformStr
}
