import { ScanPlugin } from 'capacitor-scan/dist/esm/definitions'
import { WebPlugin } from '@capacitor/core'

export class ScanWeb extends WebPlugin implements ScanPlugin {
  private worker?: Worker

  constructor() {
    super({
      name: 'Scan',
      platforms: ['web']
    })
  }

  async getMaxMemory(): Promise<{ value: number }> {
    return Promise.resolve({ value: 1024 })
  }

  async getCPUArch(): Promise<{ value: string }> {
    return Promise.resolve({ value: 'x86_64' })
  }

  async start({ variant }: { variant: string }) {
    return new Promise((resolve) => {
      if (this.worker) {
        setTimeout(resolve, 1)
      } else {
        this.worker = new Worker(`../scan_${variant}.js`)
        this.worker.onmessage = msg => {

          const ev: any = new Event('scan')
          ev['output'] = msg.data
          window.dispatchEvent(ev)
        }
        setTimeout(resolve, 1)
      }
    }).then(() => this.cmd({ 'cmd': `set-param name=variant value=${variant}` }))
  }

  async cmd({ cmd }: { cmd: string }) {
    return new Promise((resolve) => {
      if (this.worker) this.worker.postMessage(cmd)
      setTimeout(resolve, 1)
    }).then(() => {})
  }

  async exit() {
    return new Promise((resolve) => {
      if (this.worker) {
        this.worker.terminate()
        this.worker = undefined
      }
      setTimeout(resolve, 1)
    }).then(() => {})
  }
}
