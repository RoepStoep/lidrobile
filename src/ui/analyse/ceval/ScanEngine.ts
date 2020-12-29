import { Capacitor } from '@capacitor/core'
import { Tree } from '../../shared/tree/interfaces'
import { Work, IEngine } from './interfaces'
import { Scan, scanFen, parsePV, parseVariant } from '../../../scan'

const EVAL_REGEX = new RegExp(''
  + /^info depth=(\d+) mean-depth=\S+ /.source
  + /score=(\S+) nodes=(\d+) /.source
  + /time=(\S+) (?:nps=\S+ )?/.source
  + /pv=\"?([0-9\-xX\s]+)\"?/.source);

export default function ScanEngine(variant: VariantKey): IEngine {
  const scan = new Scan(variant)

  let stopTimeoutId: number
  let readyPromise: Promise<void> = Promise.resolve()

  let curEval: Tree.ClientEval | null = null
  let expectedPvs = 1

  const frisianVariant = variant === 'frisian' || variant === 'frysk'
  const uciCache: any = {}

  // after a 'go' command, scan will be continue to emit until the 'done'
  // message, reached by depth or after a 'stop' command
  // finished here means scan has emited 'done' and is ready for
  // another command
  let finished = true

  // stopped flag is true when a search has been interrupted before its end
  let stopped = false

  // we may have several start requests queued while we wait for previous
  // eval to complete
  let startQueue: Array<Work> = []

  /*
   * Init engine with default options and variant
   */
  function init() {
    return scan.plugin.start(parseVariant(variant))
      .then(() => scan.send('hub'))
      .then(() => scan.setOption('bb-size', '0'))
      .then(() => scan.send('init'))
      .catch((err: any) => console.error('scan init error', err))
  }

  /*
   * Stop current command if not already stopped, then add a search command to
   * the queue.
   * The search will start when scan is ready (after reinit if it takes more
   * than 5s to stop current search)
   */
  function start(work: Work) {
    stop()
    startQueue.push(work)

    clearTimeout(stopTimeoutId)
    const timeout: PromiseLike<void> = new Promise((_, reject) => {
      stopTimeoutId = setTimeout(reject, 5 * 1000)
    })

    return Promise.race([readyPromise, timeout])
    .then(search)
    .catch(() => {
      reset().then(search)
    })
  }

  /*
   * Sends 'stop' command to scan if not already stopped
   */
  function stop() {
    if (!stopped) {
      stopped = true
      scan.send('stop')
    }
  }

  /*
   * Actual search is launched here, according to work opts, using the last work
   * queued
   */
  function search() {
    const work = startQueue.pop()
    if (work) {
      stopped = false
      finished = false
      startQueue = []
      curEval = null

      readyPromise = new Promise((resolve) => {
        scan.addListener(line => {
          processOutput(line, work, resolve)
        })
      })

      return scan.setOption('threads', work.cores)
      .then(() => Capacitor.platform !== 'web' ?
        scan.setOption('hash', work.hash) : Promise.resolve()
      )
      .then(() => scan.send('pos pos=' + scanFen(work.initialFen) + (work.moves.length != 0 ? (' moves="' + work.moves.join(' ') + '"') : '')))
      .then(() => {
        if (work.maxDepth >= 99) return scan.send('level infinite');
        else return scan.send('level depth=' + work.maxDepth);
      })
      .then(() => scan.send('go analyze'))
    }
  }

  /*
   * Scan output processing done here
   * Calls the 'resolve' function of the 'ready' Promise when 'done'
   * command is sent by scan
   */
  function processOutput(text: string, work: Work, rdyResolve: () => void) {
    if (text.indexOf('done') === 0) {
      finished = true
      rdyResolve()
      work.emit()
    }
    if (finished || stopped) return

    const matches = text.match(EVAL_REGEX)
    if (!matches) return

    let depth = parseInt(matches[1]),
      ev = Math.round(parseFloat(matches[2]) * 100),
      nodes = parseInt(matches[3]),
      elapsedMs: number = parseFloat(matches[4]) * 1000,
      multiPv = 1,
      win: number | undefined = undefined;

    const moves = parsePV(work!.currentFen, matches[5], frisianVariant, uciCache);

    if (Math.abs(ev) > 9000) {
      const ply = ev > 0 ? (10000 - ev) : -(10000 + ev);
      win = Math.round((ply + ply % 2) / 2);
    } else if (Math.abs(ev) > 8000) {
      const ply = ev > 0 ? (9000 - ev) : -(9000 + ev);
      win = Math.round((ply + ply % 2) / 2);
    }

    // Track max pv index to determine when pv prints are done.
    if (expectedPvs < multiPv) expectedPvs = multiPv

    const pivot = work.threatMode ? 0 : 1
    if (work.ply % 2 === pivot) {
      if (win) win = -win;
      else ev = -ev;
    }

    const pvData = {
      moves,
      cp: win ? undefined : ev,
      win: win ? win : undefined,
      depth,
    };

    const knps = nodes / elapsedMs

    if (multiPv === 1) {
      curEval = {
        fen: work.currentFen,
        maxDepth: work.maxDepth,
        depth,
        knps,
        nodes,
        cp: pvData.cp,
        win: pvData.win,
        pvs: [pvData],
        millis: elapsedMs
      }
    } else if (curEval) {
      curEval.pvs.push(pvData)
      curEval.depth = Math.min(curEval.depth, depth)
    }

    if (multiPv === expectedPvs && curEval) {
      work.emit(curEval)
    }
  }
  
  function exit() {
    scan.plugin.removeAllListeners()
    return scan.plugin.exit()
  }

  function reset() {
    return exit().then(init)
  }

  return {
    init,
    start,
    stop,
    exit,
    isSearching() {
      return !finished
    }
  }
}
