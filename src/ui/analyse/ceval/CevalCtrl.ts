import settings from '../../../settings'
import { Tree } from '../../shared/tree'
import { getNbCores } from '../../../utils/scan'
import ScanEngine from './ScanEngine'
import { Opts, Work, ICevalCtrl } from './interfaces'

export default function CevalCtrl(
  variant: VariantKey,
  allowed: boolean,
  emit: (path: string, res?: Tree.ClientEval) => void,
  initOpts: Opts
): ICevalCtrl {

  let initialized = false

  const minDepth = 6
  const maxDepth = variant === 'antidraughts' ? 11 : 22

  const opts = {
    multiPv: 1, //initOpts.multiPv,
    cores: initOpts.cores,
    infinite: initOpts.infinite
  }

  const engine = ScanEngine(variant)

  let started = false
  let isEnabled = settings.analyse.enableCeval()

  function enabled() {
    return allowed && isEnabled
  }

  function onEmit(work: Work, res?: Tree.ClientEval) {
    emit(work.path, res)
  }

  function start(path: Tree.Path, nodes: Tree.Node[], forceRetroOpts: boolean) {
    if (!enabled()) {
      return
    }
    const step = nodes[nodes.length - 1]
    if (step.ceval && step.ceval.depth >= maxDepth) {
      return
    }
    const work = {
      initialFen: nodes[0].fen,
      currentFen: step.fen,
      moves: new Array<string>(),
      maxDepth: forceRetroOpts ? 18 : effectiveMaxDepth(),
      cores: forceRetroOpts ? getNbCores() : opts.cores,
      path,
      ply: step.ply,
      multiPv: 1, //forceRetroOpts ? 1 : opts.multiPv,
      threatMode: false,
      emit(res?: Tree.ClientEval) {
        if (enabled()) onEmit(work, res)
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
  }

  function shortUci(n: Tree.Node) {
    if (!n.uci) return ''
    if (n.uci.length > 4) return n.uci.slice(0, 2) + 'x' + n.uci.slice(2);
    else return n.uci.slice(0, 2) + '-' + n.uci.slice(2);
  }

  function effectiveMaxDepth() {
    return opts.infinite ? 99 : maxDepth
  }

  function destroy() {
    if (initialized) {
      engine.exit()
      .then(() => {
        initialized = false
      })
      .catch(() => {
        initialized = false
      })
    }
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
    maxDepth,
    effectiveMaxDepth,
    minDepth,
    variant,
    start,
    stop() {
      if (!enabled() || !started) return
      engine.stop()
      started = false
    },
    destroy,
    allowed,
    enabled,
    toggle() {
      isEnabled = !isEnabled
    },
    setCores(c: number) {
      opts.cores = c
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
    opts
  }
}
