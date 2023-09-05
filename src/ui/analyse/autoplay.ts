import redraw from '../../utils/redraw'
import { Tree } from '../shared/tree'
import AnalyseCtrl from './AnalyseCtrl'

export type AutoplayDelay = number | 'realtime' | 'cpl'

export class Autoplay {

  private timeoutId: number | undefined
  private delay: AutoplayDelay | undefined
  private mergedCentis: number[]

  constructor(private ctrl: AnalyseCtrl) {
    this.mergedCentis = []
    const data = ctrl.getChartData()
    const centis = data.game.moveCentis
    const treeParts = data.treeParts
    if (centis && treeParts.length) {
      let c = 0
      for (const node of treeParts.slice(1)) {
        if (node?.mergedNodes && node.mergedNodes.length > 1) {
          let merged = 0
          for (let r = 0; r < node.mergedNodes.length && c < centis.length; r++) {
            merged += centis[c]
            c++
          }
          this.mergedCentis.push(merged)
        } else {
          this.mergedCentis.push(centis[c])
          c++
        }
        if (c >= centis.length) break
      }
    }
  }

  private move(): boolean {
    if (this.ctrl.canGoForward()) {
      this.ctrl.next()
      redraw()
      return true
    }
    this.stop()
    redraw()
    return false
  }

  private evalToCp(node: Tree.Node): number {
    if (!node.eval) return (node.displayPly || node.ply) % 2 ? 990 : -990 // game over
    if (node.eval.win) return (node.eval.win > 0) ? 990 : -990
    return node.eval.cp!
  }

  private nextDelay(): number {
    if (typeof this.delay === 'string' && !this.ctrl.onMainline) return 1500
    else if (this.delay === 'realtime') {
      if (this.ctrl.node.ply < 2) return 1000
      if (!this.mergedCentis.length) return 1500
      const time = this.mergedCentis[this.ctrl.node.ply - this.ctrl.tree.root.ply]
      // estimate 50ms of lag to improve playback.
      return time * 10 + 50 || 2000
    }
    else if (this.delay === 'cpl') {
      const slowDown = 30
      if (this.ctrl.node.ply >= this.ctrl.mainline.length - 1) return 0
      const currPlyCp = this.evalToCp(this.ctrl.node)
      const nextPlyCp = this.evalToCp(this.ctrl.node.children[0])
      return Math.max(500,
        Math.min(10000,
          Math.abs(currPlyCp - nextPlyCp) * slowDown))
    }
    else return this.delay!
  }

  private schedule(): void {
    this.timeoutId = setTimeout(() => {
      if (this.move()) this.schedule()
    }, this.nextDelay())
  }

  start(delay: AutoplayDelay): void {
    this.delay = delay
    this.stop()
    this.schedule()
  }

  stop(): void {
    clearTimeout(this.timeoutId)
    this.timeoutId = undefined
  }

  toggle(delay: AutoplayDelay): void {
    if (this.active(delay)) this.stop()
    else {
      if (!this.active() && !this.move()) this.ctrl.jump('')
      this.start(delay)
    }
  }

  active(delay?: AutoplayDelay): boolean {
    return (!delay || delay === this.delay) && !!this.timeoutId
  }
}
