import { Capacitor } from '@capacitor/core'
import { Toast } from '@capacitor/toast'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'
import settings from './settings'

const baseUrl = 'https://roepstoep.github.io/lidrobile-themes'

let styleEl: HTMLStyleElement

type Theme = 'bg' | 'board'
interface ThemeEntry {
  key: string
  name: string
  ext: string
}

export function isTransparent(key: string) {
  return key !== 'dark' && key !== 'light' && key !== 'system'
}

export function init() {
  const bgTheme = settings.general.theme.background()
  const boardTheme = settings.general.theme.board()

  setStatusBarStyle(bgTheme)

  // load background theme
  if (isTransparent(bgTheme)) {
    const filenames = getFilenamesFromKey('bg', bgTheme)
    getLocalFiles('bg', filenames).then(r => {
      createStylesheetRule('bg', bgTheme, filenames, r)
    })
    .catch(() => {
      settings.general.theme.background('dark')
    })
  }

  // load board theme
  if (!settings.general.theme.bundledBoardThemes.includes(boardTheme)) {
    const filenames = getFilenamesFromKey('board', boardTheme)
    getLocalFiles('board', filenames).then(r => {
      createStylesheetRule('board', boardTheme, filenames, r)
    })
    .catch(() => {
      settings.general.theme.board('brown')
    })
  }
}

function getLocalFiles(theme: Theme, filenames: string[]): Promise<string[]> {
  return Promise.all(filenames.map(
    (filename) => Filesystem.readFile({
      path: theme + '-' + filename,
      directory: Directory.Data
    }).then(f => typeof(f.data) === 'string' ? Promise.resolve(f.data) : f.data.text())
  ))
}

export function enumLocalDir(theme: Theme): Promise<readonly string[]> {
  return Filesystem.readdir({
    path: '',
    directory: Directory.Data
  }).then(({ files }) => files.map(f => f.name).filter(f => f.startsWith(theme)))
}

export function filenameBg(entry: ThemeEntry): string {
  return entry.key + '.' + entry.ext
}

export function filenamesBoard(entry: ThemeEntry): string[] {
  return [
    entry.key + '_64.' + entry.ext,
    entry.key + '_100.' + entry.ext,
  ]
}

// either download it from server of get it from filesystem
export function loadImages(
  theme: Theme,
  key: string,
  onProgress: (e: ProgressEvent) => void
): Promise<void> {
  const filenames = getFilenamesFromKey(theme, key)
  return getLocalFiles(theme, filenames)
  .catch(() => {
    // if not found, download
    return Promise.all(filenames.map(filename => download(theme, filename, onProgress)))
    .then(() => getLocalFiles(theme, filenames))
  })
  .then(res => {
    createStylesheetRule(theme, key, filenames, res)
  })
}

export function handleError(err: any) {
  console.error(err)
  Toast.show({ text: 'Cannot load theme file', duration: 'short' })
}

function createStylesheetRule(
  theme: Theme,
  key: string,
  filenames: string[],
  files: string[]
): void {
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.type = 'text/css'
    document.head.appendChild(styleEl)
  }
  const cleanData = files.map(f => f.replace(/\n/g, '')) // FIXME should be fixed in capacitor
  const ext = filenames[0].split('.').pop()
  const mime = ext === 'png' ?
    'data:image/png;base64,' : 'data:image/jpeg;base64,'
  const dataUrls = cleanData.map(data => mime + data)
  const css = theme === 'bg' ?
    `.view-container.transp.${key} > main { background-image: url(${dataUrls[0]}); }` :
    `:root { --board-background-64: url(${dataUrls[0]}); --board-background-100: url(${dataUrls[1]}); }\n` +
    `.board-${key}.is64 > .cg-board { background-image: var(--board-background-64); }\n` +
    `.board-${key}.is100 > .cg-board { background-image: var(--board-background-100); }\n` +
    `.game_menu_button.${key}::before { background-image: var(--board-background-64); background-size: 40px; }`

  styleEl.appendChild(document.createTextNode(css))
}

function getFilenamesFromKey(theme: Theme, key: string): string[] {
  const avails = theme === 'bg' ?
    settings.general.theme.availableBackgroundThemes :
    settings.general.theme.availableBoardThemes

  const t = avails.find(t => t.key === key)!

  return theme === 'bg' ? [filenameBg(t)] : filenamesBoard(t)
}

function download(
  theme: Theme,
  fileName: string,
  onProgress: (e: ProgressEvent) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new XMLHttpRequest()
    const themePath = theme === 'bg' ? '/background' : '/board'
    client.open('GET', `${baseUrl}${themePath}/${fileName}`, true)
      client.responseType = 'blob'
      if (onProgress) {
        client.onprogress = onProgress
      }
      client.onload = () => {
        if (client.status === 200) {
          const blob = client.response
          if (blob) {
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = () => {
              const base64data = reader.result as string
              Filesystem.writeFile({
                path: theme + '-' + fileName,
                data: base64data,
                directory: Directory.Data,
              })
              .then(() => resolve())
            }
          } else {
            reject('could not get file')
          }
        } else {
          reject(`Request returned ${client.status}`)
        }
      }
      client.send()
  })
}

let systemTheme: string
export function getSystemTheme(): string {
  if (systemTheme === undefined) {
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    systemTheme = mql.matches ? 'light' : 'dark'
    mql.addEventListener('change', e => {
      systemTheme = e.matches ? 'light' : 'dark'
    })
  }

  return systemTheme
}

export function setStatusBarStyle(key: string): Promise<void> {
  const bgTheme = key === 'system' ? getSystemTheme() : key
  return Promise.all([
    Capacitor.getPlatform() === 'android' ? StatusBar.setBackgroundColor({
      color: bgTheme === 'light' ? '#edebe9' :
        bgTheme === 'dark' ? '#161512' : '#000000'
    }) : Promise.resolve(),
    StatusBar.setStyle({
      style: bgTheme === 'light' ? StatusBarStyle.Light : StatusBarStyle.Dark
    }),
    // StatusBar.setOverlaysWebView({
    //   overlay: isTransparent(bgTheme)
    // }),
  ]).then(() => { /* noop */ })
}

