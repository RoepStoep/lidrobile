import { Tree } from '../../shared/tree/interfaces'
import { Work, IEngine } from './interfaces'
import { send, setOption, scanFen, scanPieces, parseVariant } from '../../../utils/scan'

const EVAL_REGEX = new RegExp(''
  + /^info depth=(\d+) mean-depth=\S+ /.source
  + /score=(\S+) nodes=(\d+) /.source
  + /time=(\S+) (?:nps=\S+ )?/.source
  + /pv=\"?(.+)\"?/.source);

export default function ScanEngine(variant: VariantKey): IEngine {

  let stopTimeoutId: number
  let readyPromise: Promise<void> = Promise.resolve()

  let curEval: Tree.ClientEval | null = null
  let expectedPvs = 1

  const frisianVariant = variant === 'frisian' || variant === 'frysk';

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
    return Scan.init(parseVariant(variant))
      .then(() => {
        return send('hub')
          .then(() => setOption('bb-size', '0'))
          .then(() => send('init'))
      })
      .catch(err => console.error('scan init error', err))
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

    Promise.race([readyPromise, timeout])
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
      send('stop')
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

      readyPromise = new Promise((resolve) => {
        Scan.output((msg: string) => processOutput(msg, work, resolve))
      })

      return setOption('threads', work.cores)
      .then(() => send('pos pos=' + scanFen(work.initialFen) + (work.moves.length != 0 ? (' moves="' + work.moves.join(' ') + '"') : '')))
      .then(() => {
        if (work.maxDepth >= 99) send('level infinite');
        else {
          send('level move-time=90');
          send('level depth=' + work.maxDepth);
        }
      })
      .then(() => send('go analyze'))
    }
  }

  /*
   * Scan output processing done here
   * Calls the 'resolve' function of the 'ready' Promise when 'done'
   * command is sent by scan
   */
  function processOutput(text: string, work: Work, rdyResolve: () => void) {
    console.log('[scan >>] ' + text)
    if (text.indexOf('done') === 0) {
      console.debug('[scan >>] ' + text)
      finished = true
      rdyResolve()
      work.emit()
    }
    if (finished || stopped) return
    // console.debug(text)

    const matches = text.match(EVAL_REGEX)
    if (!matches) return

    let depth = parseInt(matches[1]),
      ev = Math.round(parseFloat(matches[2]) * 100),
      nodes = parseInt(matches[3]),
      elapsedMs: number = parseFloat(matches[4]) * 1000,
      multiPv = 1,
      win: number | undefined = undefined;

    const fieldX = (f: number) => f % 5 + 1;
    const fieldY = (f: number) => (f + (5 - f % 5)) / 5;

    const walkLine = (pieces: string[], king: boolean, srcF: number, dstF: number, forbiddenDsts: number[], eyesF?: number, eyesStraight?: boolean): number | undefined => {
      const srcY = fieldY(srcF), srcX = fieldX(srcF);
      const dstY = fieldY(dstF), dstX = fieldX(dstF);
      const up = dstY > srcY;
      const right = dstX > srcX || (dstX == srcX && srcY % 2 == 0)
      const vertical = frisianVariant && dstY !== srcY && dstX === srcX && Math.abs(dstY - srcY) % 2 === 0;
      const horizontal = frisianVariant && dstX !== srcX && dstY === srcY;
      let walker = eyesF ? dstF : srcF, steps = 0, touchedDst = false;
      while ((king || steps < 1) && (eyesF !== undefined || (walker !== dstF && !touchedDst) || steps === 0)) {

        const walkerY = fieldY(walker);
        if (up) {
          walker += 5;
          if (vertical) walker += 5;
          else if (right) walker += walkerY % 2 == 1 ? 1 : 0;
          else walker += walkerY % 2 == 0 ? -1 : 0;
        } else if (horizontal) {
          const walkerX = fieldX(walker);
          if (right) {
            if (walkerX < 5) walker += 1
            else return undefined;
          } else {
            if (walkerX > 1) walker -= 1
            else return undefined;
          }
        } else {
          walker -= 5;
          if (vertical) walker -= 5;
          else if (right) walker += walkerY % 2 == 1 ? 1 : 0;
          else walker += walkerY % 2 == 0 ? -1 : 0;
        }
        steps++;

        if (walker < 0 || walker > 49) return undefined;
        if (!(horizontal || vertical) && Math.abs(fieldY(walker) - walkerY) !== 1) return undefined;
        if (pieces[walker]) {
          if (walker !== dstF)
            return undefined;
          if (eyesF === undefined)
            touchedDst = true;
          steps = 0;
        }

        if (eyesF !== undefined) {
          if (eyesStraight) {
            if (eyesF === walker) return walker; // eyesStraight: destination square only in current capture direction
          } else if (forbiddenDsts.indexOf(walker) === -1 && walkLine(pieces, king, walker, eyesF, []) !== undefined) {
            return walker; // !eyesStraight: current capture direction or perpendicular
          }
        }
      }
      return (walker === dstF || touchedDst) ? srcF : undefined;
    }

    const tryCaptures = (pieces: string[], capts: number[], cur: number, dest: number): number[] => {
      for (let i = 0; i < capts.length; i++) {
        const capt = capts[i]; 
        const king = (pieces[cur] === 'W' || pieces[cur] === 'B');
        if (walkLine(pieces, king, cur, capt, []) !== undefined) {
          for (let k = 0; k < capts.length; k++) {
            const captNext = i !== k ? capts[k] : (capts.length === 1 ? dest : -1);
            if (captNext !== -1) {
              const pivots: number[] = [];
              let pivot: number | undefined;
              do
              {
                pivot = walkLine(pieces, king, cur, capt, pivots, captNext, i === k && capts.length === 1);
                if (pivot !== undefined) {
                  const newCapts = capts.slice();
                  newCapts.splice(i, 1);
                  const newPieces = pieces.slice();
                  newPieces[capt] = 'x';
                  newPieces[pivot] = pieces[cur];
                  newPieces[cur] = "";
                  const sequence = [pivot].concat(tryCaptures(newPieces, newCapts, pivot, dest));
                  if (sequence.length == capts.length) return sequence;
                  pivots.push(pivot);
                }
              } while (pivot !== undefined);
            }
          }
        }
      }
      return [];
    }

    let moveNr = 0;
    const moves = matches[5].split(' ').map(m => {
      moveNr++;
      const takes = m.indexOf('x');
      if (takes != -1) {
        const fields = m.split('x').map(f => parseInt(f) - 1);
        const orig = fields[0], dest = fields[1];
        let uci: string[] = [(orig + 1).toString()];
        if (fields.length > 3 && moveNr === 1) { // full uci information is only relevant for the first move
          //captures can appear in any order, so try until we find a line that captures everything
          const sequence = tryCaptures(scanPieces(work!.currentFen), fields.slice(2), orig, dest);
          if (sequence) uci = uci.concat(sequence.map(m => (m + 1).toString()));
        } else
          uci.push((dest + 1).toString());
        return uci.join('x');
      } else return m;
    });

    if (Math.abs(ev) > 9000) {
      const ply = ev > 0 ? (10000 - ev) : -(10000 + ev);
      win = Math.round((ply + ply % 2) / 2);
    } else if (Math.abs(ev) > 8000) {
      const ply = ev > 0 ? (9000 - ev) : -(9000 + ev);
      win = Math.round((ply + ply % 2) / 2);
    }

    // Track max pv index to determine when pv prints are done.
    if (expectedPvs < multiPv) expectedPvs = multiPv

    let pivot = work.threatMode ? 0 : 1
    if (work.ply % 2 === pivot) {
      if (win) win = -win;
      else ev = -ev;
    }

    let pvData = {
      moves,
      cp: win ? undefined : ev,
      win: win ? win : undefined,
      depth,
    };

    if (multiPv === 1) {
      curEval = {
        fen: work.currentFen,
        maxDepth: work.maxDepth,
        depth,
        knps: nodes / elapsedMs,
        nodes,
        cp: win ? undefined : ev,
        win: win ? win : undefined,
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
    return Scan.exit()
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
