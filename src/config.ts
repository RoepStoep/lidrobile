export interface Config {
  mode: 'dev' | 'prod'
  apiEndPoint: string
  socketEndPoint: string
  apiVersion: number
  fetchTimeoutMs: Millis
}

const defaults = {
  apiVersion: 3,
  fetchTimeoutMs: 15000
}

const config = Object.assign({}, defaults, window.lidraughts)

export default config as Config
