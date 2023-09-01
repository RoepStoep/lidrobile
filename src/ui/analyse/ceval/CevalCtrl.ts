import settings from '../../../settings'
import { Tree } from '../../shared/tree'
import ScanClient from './ScanClient'
import { Opts, Work, ICevalCtrl, Started } from './interfaces'
import { povChances } from './winningChances'

export default function CevalCtrl(
  opts: Opts,
  emit: (path: string, ev?: Tree.ClientEval) => void,
): ICevalCtrl {

  let initialized = false

  const minDepth = 6
  // const maxDepth = opts.variant === 'antidraughts' ? 11 : 22

  const engine = new ScanClient(opts.variant, opts.cores, opts.hashSize)

  let started = false
  let isDeeper = false
  let lastStarted: Started | undefined = undefined
  let isEnabled = settings.analyse.enableCeval()

  function enabled() {
    return opts.allowed && isEnabled
  }

  // adjusts maxDepth based on nodes per second
  const npsRecorder = (() => {
    const values: number[] = []
    const applies = (ev: Tree.ClientEval) => {
      return ev.knps && ev.depth >= 16 &&
        ev.cp !== undefined && Math.abs(ev.cp) < 500 &&
        (ev.fen.split(/\s/)[0].split(/[nbrqkp]/i).length - 1) >= 10
    }
    return (ev: Tree.ClientEval) => {
      if (!applies(ev)) return
      values.push(ev.knps!)
      if (values.length > 9) {
        const knps = median(values) || 0
        let depth = 18
        if (knps > 100) depth = 19
        if (knps > 150) depth = 20
        if (knps > 250) depth = 21
        if (knps > 500) depth = 22
        if (knps > 1000) depth = 23
        if (knps > 2000) depth = 24
        if (knps > 3500) depth = 25
        if (knps > 5000) depth = 26
        if (knps > 7000) depth = 27
        if (settings.analyse.cevalMaxDepth() !== depth) {
          settings.analyse.cevalMaxDepth(depth)
        }
        if (values.length > 40) values.shift()
      }
    }
  })()

  function sortPvsInPlace(pvs: Tree.PvData[], color: Color) {
    return pvs.sort((a, b) => {
      return povChances(color, b) - povChances(color, a)
    })
  }

  function onEmit(work: Work, ev?: Tree.ClientEval) {
    if (ev) sortPvsInPlace(ev.pvs, (work.ply % 2 === 0) ? 'white' : 'black')
    if (ev) npsRecorder(ev)
    emit(work.path, ev)
  }

  async function start(path: Tree.Path, nodes: Tree.Node[], forceMaxLevel: boolean, deeper: boolean) {
    if (!enabled()) {
      return
    }
    isDeeper = deeper
    const step = nodes[nodes.length - 1]
    const maxDepth = effectiveMaxDepth(deeper)
    if (step.ceval && step.ceval.depth >= maxDepth) {
      return
    }
    const work = {
      initialFen: nodes[0].fen,
      currentFen: step.fen,
      moves: new Array<string>(),
      maxDepth: forceMaxLevel ? settings.analyse.cevalMaxDepth() : effectiveMaxDepth(deeper),
      path,
      ply: step.ply,
      multiPv: 1, // forceMaxLevel ? 1 : opts.multiPv,
      threatMode: false,
      emit(ev?: Tree.ClientEval) {
        if (enabled()) onEmit(work, ev)
      }
    }

    // send moves after last capture
    for (let i = 1; i < nodes.length; i++) {
      let s = nodes[i];
      if (s.san!.indexOf('x') !== -1) {
        work.moves = [];
        work.initialFen = s.fen;
      } else work.moves.push(shortUci(s));
    }

    engine.start(work)
    started = true
    lastStarted = {
      path,
      nodes,
    }
  }

  function shortUci(n: Tree.Node) {
    if (!n.uci) return ''
    if (n.uci.length > 4) return n.uci.slice(0, 2) + 'x' + n.uci.slice(2);
    else return n.uci.slice(0, 2) + '-' + n.uci.slice(2);
  }

  function effectiveMaxDepth(deeper = false) {
    return (deeper || opts.infinite) ? 99 : settings.analyse.cevalMaxDepth()
  }

  function destroy() {
    if (initialized) {
      engine.exit()
      .then(() => {
        initialized = false
        started = false
      })
      .catch(() => {
        initialized = false
        started = false
      })
    }
  }

  function stop() {
    if (!enabled() || !started) return
    engine.stop()
    started = false
  }

  return {
    init() {
      return engine.init().then(() => {
        initialized = true
      })
    },
    isInit() {
      return initialized
    },
    isSearching() {
      return engine.isSearching()
    },
    effectiveMaxDepth,
    minDepth,
    variant: opts.variant,
    start,
    stop,
    destroy,
    allowed: opts.allowed,
    enabled,
    toggle() {
      isEnabled = !isEnabled
    },
    disable() {
      isEnabled = false
    },
    setMultiPv(_: number) {
      opts.multiPv = 1 //pv
    },
    getMultiPv(): number {
      return 1 //opts.multiPv
    },
    toggleInfinite() {
      opts.infinite = !opts.infinite
    },
    goDeeper(): void {
      if (lastStarted) {
        start(lastStarted.path, lastStarted.nodes, false, true)
      }
    },
    canGoDeeper(): boolean {
      return !isDeeper && !opts.infinite && !engine.isSearching()
    },
    getEngineName(): string {
      return engine.engineName
    },
  }
}

function median(values: number[]): number {
  values.sort((a, b) => a - b)
  const half = Math.floor(values.length / 2)
  return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2.0
}
