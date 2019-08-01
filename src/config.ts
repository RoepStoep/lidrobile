export interface Config {
  mode: 'dev' | 'release'
  apiEndPoint: string
  socketEndPoint: string
  apiVersion: number
  fetchTimeoutMs: Millis
}

const defaults = {
  apiVersion: 2,
  fetchTimeoutMs: 10000
}

const config = Object.assign({}, defaults, window.lichess)

export default config as Config
