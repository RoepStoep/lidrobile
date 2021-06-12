import { Capacitor, WebPlugin, registerWebPlugin, Plugins } from '@capacitor/core'
// custom web plugin registration done here for now
// because importing code from node_modules causes capacitor runtime code to
// be included twice

if (Capacitor.platform === 'web') {

  // Scan
  class ScanWeb extends WebPlugin {
    private worker?: Worker

    constructor() {
      super({
        name: 'Scan',
        platforms: ['web']
      })
    }

    async getMaxMemory(): Promise<number> {
      return Promise.resolve(1024)
    }

    async start() {
      return new Promise((resolve) => {
        if (this.worker) {
          setTimeout(resolve, 1)
        } else {
          this.worker = new Worker('../scan.js')
          this.worker.onmessage = msg => {

            const ev: any = new Event('scan')
            ev['output'] = msg.data
            window.dispatchEvent(ev)
          }
          setTimeout(resolve, 1)
        }
      })
    }

    async cmd({ cmd }: { cmd: string }) {
      return new Promise((resolve) => {
        if (this.worker) this.worker.postMessage(cmd)
          setTimeout(resolve, 1)
      })
    }

    async exit() {
      return new Promise((resolve) => {
        if (this.worker) {
          this.worker.terminate()
          this.worker = undefined
        }
        setTimeout(resolve, 1)
      })
    }
  }
  const scanWeb = new ScanWeb()
  registerWebPlugin(scanWeb)
}
