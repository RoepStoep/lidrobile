import { Capacitor } from '@capacitor/core'
import { ScanPlugin, scanFen, parsePV } from '../../../scan'
import { defer, Deferred } from '../../../utils/defer'
import * as Tree from '../../shared/tree/interfaces'
import { Work } from './interfaces'

const EVAL_REGEX = new RegExp(''
  + /^info depth=(\d+) mean-depth=\S+ /.source
  + /score=(\S+) nodes=(\d+) /.source
  + /time=(\S+) (?:nps=\S+ )?/.source
  + /pv="?([0-9\-xX\s]+)"?/.source)

export default class ScanClient {
  private readonly scan: ScanPlugin
  private n_threads: number
  private frisianVariant: boolean

  private stopTimeoutId?: number
  private work?: Work
  private curEval?: Tree.ClientEval
  private uciCache: any = {}
  private expectedPvs = 1

  // after a 'go' command, scan will be continue to emit until the 'done'
  // message, reached by depth or after a 'stop' command
  // finished here means scan has emited 'done' and is ready for
  // another command
  private ready: Deferred<void>
  // we may have several start requests queued while we wait for previous
  // eval to complete
  private startQueue: Work[] = []
  // stopped flag is true when a search has been interrupted before its end
  private stopped = false

  public engineName = 'Scan'

  constructor(
    readonly variant: VariantKey,
    threads: number,
    hash: number,
  ) {
    this.scan = new ScanPlugin(variant, hash)
    this.n_threads = threads
    this.frisianVariant = variant === 'frisian' || variant === 'frysk'
    this.ready = defer()
    this.ready.resolve()
  }

  /*
   * Init engine with default options and variant
   */
  public init = async (): Promise<void> => {
    try {
      window.addEventListener('scan', this.listener, { passive: true })
      const obj = await this.scan.start()
      this.engineName = obj.engineName

      if (Capacitor.getPlatform() !== 'web') {
        await this.scan.setOption('threads', this.n_threads)
      }
    } catch (err: unknown) {
      console.error('scan init error', err)
    }
  }

  public setThreads = (threads: number): Promise<void> => {
    this.n_threads = threads
    return this.scan.setOption('threads', this.n_threads)
  }

  /*
   * Stop current command if not already stopped, then add a search command to
   * the queue.
   * The search will start when scan is ready (after reinit if it takes more
   * than 10s to stop current search)
   */
  public start = (work: Work): Promise<void> => {
    void this.stop()
    this.startQueue.push(work)

    clearTimeout(this.stopTimeoutId)
    const timeout: PromiseLike<void> = new Promise((_, reject) => {
      this.stopTimeoutId = setTimeout(reject, 10 * 1000)
    })

    return Promise.race([this.ready.promise, timeout])
    .then(this.search)
    .catch(() => {
      return this.reset().then(this.search)
    })
  }

  /*
   * Sends 'stop' command to scan if not already stopped
   */
  public stop = async (): Promise<void> => {
    if (!this.stopped) {
      this.stopped = true
      return this.scan.send('stop')
    }
  }

  public isSearching(): boolean {
    return this.ready.state === 'pending'
  }

  public exit = (): Promise<void> => {
    window.removeEventListener('scan', this.listener, false)
    return this.scan.exit()
  }

  private reset = (): Promise<void> => {
    return this.exit().then(this.init)
  }

  /*
   * Actual search is launched here, according to work opts, using the last work
   * queued
   */
  private search = async () => {
    const work = this.startQueue.pop()
    if (work) {
      this.work = work
      this.curEval = undefined
      this.expectedPvs = 1
      this.stopped = false
      this.startQueue = []
      this.ready = defer()

      await this.scan.send('pos pos=' + scanFen(work.initialFen) + (work.moves.length !== 0 ? (' moves="' + work.moves.join(' ') + '"') : ''))
      if (work.maxDepth >= 99) {
        await this.scan.send('level infinite')
      } else {
        await this.scan.send(`level depth=${work.maxDepth}`)
      }
      await this.scan.send('go analyze')
    }
  }

  /*
   * Scan output processing done here
   * Calls the 'resolve' function of the 'ready' Promise when 'done'
   * command is sent by scan
   */
  private processOutput(text: string) {
    console.debug('[scan >>] ' + text)

    if (text.indexOf('done') === 0) {
      this.ready.resolve()
      this.work?.emit()
    }
    if (this.stopped || this.work === undefined) return

    const matches = EVAL_REGEX.exec(text)
    if (!matches) return

    const depth = parseInt(matches[1]),
      nodes = parseInt(matches[3]),
      elapsedMs: number = parseFloat(matches[4]) * 1000,
      multiPv = 1,
      moves = parsePV(this.work!.currentFen, matches[5], this.frisianVariant, this.uciCache)

    let ev = Math.round(parseFloat(matches[2]) * 100),
      win: number | undefined = undefined

    if (Math.abs(ev) > 9000) {
      const ply = ev > 0 ? (10000 - ev) : -(10000 + ev)
      win = Math.round((ply + ply % 2) / 2)
    } else if (Math.abs(ev) > 8000) {
      const ply = ev > 0 ? (9000 - ev) : -(9000 + ev)
      win = Math.round((ply + ply % 2) / 2)
    }

    // Track max pv index to determine when pv prints are done.
    if (this.expectedPvs < multiPv) this.expectedPvs = multiPv

    const pivot = this.work.threatMode ? 0 : 1
    if (this.work.ply % 2 === pivot) {
      if (win) win = -win
      else ev = -ev
    }

    const pvData = {
      moves,
      cp: win ? undefined : ev,
      win: win ? win : undefined,
      depth,
    }

    if (multiPv === 1) {
      this.curEval = {
        fen: this.work.currentFen,
        maxDepth: this.work.maxDepth,
        depth,
        knps: nodes / elapsedMs,
        nodes,
        cp: pvData.cp,
        win: pvData.win,
        pvs: [pvData],
        millis: elapsedMs
      }
    } else if (this.curEval) {
      this.curEval.pvs.push(pvData)
      this.curEval.depth = Math.min(this.curEval.depth, depth)
    }

    if (multiPv === this.expectedPvs && this.curEval) {
      this.work.emit(this.curEval)
    }
  }

  private listener = (e: Event) => {
    this.processOutput((e as any).output)
  }
}
