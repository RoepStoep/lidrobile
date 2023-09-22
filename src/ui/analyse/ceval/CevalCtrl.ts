import settings from '../../../settings'
import { Tree } from '../../shared/tree'
import ScanClient from './ScanClient'
import { Opts, Work, Started } from './interfaces'
import { povChances } from './winningChances'
import { decomposeUci } from '~/utils/draughtsFormat'

export default class CevalCtrl {
  public readonly minDepth = 6
  public readonly allowed: boolean

  private initialized = false
  private engine: ScanClient
  private started = false
  public isDeeper = false
  private lastStarted: Started | undefined = undefined
  private isEnabled: boolean

  constructor(
    readonly opts: Opts,
    readonly emit: (path: string, ev?: Tree.ClientEval, isThreat?: boolean) => void,
  ) {
    this.allowed = opts.allowed
    this.isEnabled = settings.analyse.enableCeval()
    this.engine = new ScanClient(opts.variant, opts.cores, opts.hashSize)
  }

  public enabled(): boolean {
    return this.opts.allowed && this.isEnabled
  }

  public init = (): Promise<void> => {
    return this.engine.init().then(() => {
      this.initialized = true
    })
  }

  private cevalMaxDepth = 
    this.opts.variant === 'antidraughts' ? settings.analyse.cevalMaxDepthAnti : settings.analyse.cevalMaxDepthNormal

  public async start(threatMode: boolean, path: Tree.Path, nodes: Tree.Node[], forceMaxDepth: boolean, deeper: boolean): Promise<void> {
    if (!this.enabled()) {
      return
    }

    this.isDeeper = deeper
    const maxDepth = this.effectiveMaxDepth(forceMaxDepth)

    const step = nodes[nodes.length - 1]
    const existing = threatMode ? step.threat : step.ceval
    if (existing && existing.depth >= maxDepth) {
      return
    }
    const work: Work = {
      initialFen: nodes[0].fen,
      currentFen: step.fen,
      moves: [],
      maxDepth,
      path,
      ply: step.ply,
      multiPv: 1, // forceMaxDepth ? 1 : this.opts.multiPv,
      threatMode,
      emit: (ev?: Tree.ClientEval) => {
        if (this.enabled()) this.onEmit(work, ev)
      }
    }

    if (threatMode) {
      const c = step.ply % 2 === 1 ? 'W' : 'B'
      const fen = c + step.fen.slice(1)
      work.currentFen = fen
      work.initialFen = fen
    } else {
      // send fen after latest capture and the following moves
      for (let i = 1; i < nodes.length; i++) {
        const s = nodes[i]
        if (s.san!.indexOf('x') !== -1) {
          work.moves = []
          work.initialFen = s.fen
        } else work.moves.push(scanMove(s))
      }
    }

    await this.engine.start(work)
    this.started = true
    this.lastStarted = {
      threatMode,
      path,
      nodes,
    }
  }

  // Useful if/when options change while analysis is running.
  private restart = async (): Promise<void> => {
    if (this.lastStarted) {
      await this.engine.stop()
      await this.start(this.lastStarted.threatMode, this.lastStarted.path, this.lastStarted.nodes, false, this.isDeeper)
    }
  }

  public isInit(): boolean {
    return this.initialized
  }

  public isSearching(): boolean {
    return this.engine.isSearching()
  }

  public destroy = async (): Promise<void> => {
    if (this.initialized) {
      return this.engine.exit()
      .then(() => {
        this.initialized = false
        this.started = false
      })
      .catch(() => {
        this.initialized = false
        this.started = false
      })
    }
  }

  public stop = (): void => {
    if (!this.enabled() || !this.started) return
    void this.engine.stop()
    this.started = false
  }

  public toggle = (): void => {
    this.isEnabled = !this.isEnabled
  }

  public disable = (): void => {
    this.isEnabled = false
  }

  public setMultiPv(pv: number): void {
    this.opts.multiPv = pv
    void this.restart()
  }

  public setCores = (cores: number): Promise<void> => {
    this.opts.cores = cores
    return this.engine.setThreads(cores).then(this.restart)
  }

  public setHashSize = async (hash: number): Promise<void> => {
    this.opts.hashSize = hash
    return this.destroy().then(() =>{
      this.engine = new ScanClient(this.opts.variant, this.opts.cores, this.opts.hashSize)
      return this.init().then(this.restart)
    })
  }

  public getMultiPv(): number {
    return 1 // this.opts.multiPv
  }

  public toggleInfinite = (): void => {
    this.opts.infinite = !this.opts.infinite
    this.restart()
  }

  public goDeeper = (): void => {
    if (this.lastStarted) {
      this.start(this.lastStarted.threatMode, this.lastStarted.path, this.lastStarted.nodes, false, true)
    }
  }

  public canGoDeeper(): boolean {
    return !this.isDeeper && !this.opts.infinite && !this.engine.isSearching()
  }

  public getEngineName(): string {
    return this.engine.engineName
  }

  public effectiveMaxDepth(forceMaxDepth = false): number {
    return (forceMaxDepth || this.isDeeper || this.opts.infinite) ? 99 : this.cevalMaxDepth()
  }

  private onEmit = (work: Work, ev?: Tree.ClientEval) => {
    if (ev) sortPvsInPlace(ev.pvs, (work.ply % 2 === 0) ? 'white' : 'black')
    if (ev) npsRecorder(ev, this.opts.variant)
    this.emit(work.path, ev, work.threatMode)
  }
}

function scanMove(n: Tree.Node) {
  if (!n.uci) return ''
  const parts = decomposeUci(n.uci)
  if (parts.length > 2) return parts.join('x')
  return `${parts[0]}-${parts[parts.length - 1]}`
}

function median(values: number[]): number {
  values.sort((a, b) => a - b)
  const half = Math.floor(values.length / 2)
  return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2.0
}

function sortPvsInPlace(pvs: Tree.PvData[], color: Color) {
  return pvs.sort((a, b) => {
    return povChances(color, b) - povChances(color, a)
  })
}

const npsRecorder = (() => {
  const valuesNormal: number[] = []
  const valuesAnti: number[] = []
  const applies = (ev: Tree.ClientEval, minDepth: number) => {
    return ev.knps && ev.depth >= minDepth &&
      ev.cp !== undefined && Math.abs(ev.cp) < 500 &&
      (ev.fen.split(',').length - 1) >= 10
  }
  return (ev: Tree.ClientEval, v: VariantKey) => {
    if (!applies(ev, v === 'antidraughts' ? 3 : 14)) return
    const values = v === 'antidraughts' ? valuesAnti : valuesNormal
    values.push(ev.knps!)
    if (values.length > 9) {
      const knps = median(values) || 0
      let depth: number
      if (v === 'antidraughts') {
        depth = 6
        if (knps > 1000) depth = 7
        if (knps > 3000) depth = 8
        if (knps > 5000) depth = 9
        if (knps > 8000) depth = 10
        if (knps > 11000) depth = 11
        if (knps > 14000) depth = 12
        if (settings.analyse.cevalMaxDepthAnti() !== depth) {
          settings.analyse.cevalMaxDepthAnti(depth)
        }
      } else {
        depth = 18
        if (knps > 500) depth = 19
        if (knps > 1000) depth = 20
        if (knps > 3000) depth = 21
        if (knps > 5000) depth = 22
        if (knps > 7000) depth = 23
        if (knps > 9000) depth = 24
        if (knps > 11000) depth = 25
        if (knps > 13000) depth = 26
        if (knps > 15000) depth = 27
        if (settings.analyse.cevalMaxDepthNormal() !== depth) {
          settings.analyse.cevalMaxDepthNormal(depth)
        }
      }
      if (values.length > 40) values.shift()
    }
  }
})()
