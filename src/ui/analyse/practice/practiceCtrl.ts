import { scan2uci, scan2san } from '../../../utils/draughtsFormat'
import settings from '../../../settings'
import redraw from '../../../utils/redraw'
import { requestIdleCallback, prop, Prop } from '../../../utils'
import { path as treePath, Tree } from '../../shared/tree'
import { detectThreefold } from '../nodeFinder'
import { tablebaseGuaranteed, defined } from '../util'
import { povDiff } from '../ceval/winningChances'
import { Eval } from '../ceval/interfaces'
import AnalyseCtrl from '../AnalyseCtrl'

type Verdict = 'goodMove' | 'inaccuracy' | 'mistake' | 'blunder'

export interface Comment {
  prev: Tree.Node
  node: Tree.Node
  path: Tree.Path
  verdict: Verdict
  best?: {
    uci: Uci
    san: San
  }
}

interface Hinting {
  mode: 'move' | 'piece'
  uci: Uci
}

export interface PracticeCtrl {
  onCeval(): void
  onJump(): void
  isMyTurn(): boolean
  comment: Prop<Comment | null>
  running: Prop<boolean>
  hinting: Prop<Hinting | null>
  minimized: Prop<boolean>
  resume(): void
  playableDepth: () => number
  reset(): void
  preUserJump(from: Tree.Path, to: Tree.Path): void
  postUserJump(from: Tree.Path, to: Tree.Path): void
  onUserMove(): void
  playCommentBest(): void
  hint(): void
  currentNode(): Tree.Node
  bottomColor(): Color
  toggleWindow(): void
  pieceTheme: string
}

export function make(root: AnalyseCtrl, playableDepth: () => number): PracticeCtrl {

  const variant = root.data.game.variant.key,
  minimized = prop(false),
  running = prop(true),
  comment = prop<Comment | null>(null),
  hinting = prop<Hinting | null>(null),
  played = prop(false)

  function ensureCevalRunning() {
    if (!root.ceval.enabled()) {
      root.ceval.toggle()
      root.initCeval()
    }
  }

  function commentable(node: Tree.Node, v: VariantKey, bonus = 0): boolean {
    if (root.gameOver(node) || node.tbhit) return true
    const ceval = node.ceval,
      depth = v === 'antidraughts' ? 7 : 15,
      minDepth = v === 'antidraughts' ? 6 : 13
    return ceval ? ((ceval.depth + bonus) >= depth || (ceval.depth >= minDepth && Number(ceval.millis) > 3000)) : false
  }

  function playable(node: Tree.Node, v: VariantKey): boolean {
    const ceval = node.ceval,
      depth = v === 'antidraughts' ? 7 : 15
    const doPlay = ceval ? (
      ceval.depth >= Math.min(ceval.maxDepth || 99, playableDepth()) ||
      (ceval.depth >= depth && (ceval.cloud || Number(ceval.millis) > 5000))
    ) : false
    if (doPlay && ceval && ceval.depth < 50) {
      return !!(ceval.cloud || !ceval.millis || ceval.millis > 500)
    }
    return doPlay
  }

  function tbhitToEval(hit: Tree.TablebaseHit | undefined | null) {
    return hit && (
      hit.winner ? {
        win: hit.winner === 'white' ? 10 : -10
      } : { cp: 0 }
    )
  }

  function nodeBestUci(node: Tree.Node): Uci | undefined {
    return (node.tbhit && node.tbhit.best) || (node.ceval && scan2uci(node.ceval.pvs[0].moves[0]))
  }

  function nodeBestSan(node: Tree.Node): Uci | undefined {
    return (node.tbhit && node.tbhit.best) || (node.ceval && scan2san(node.ceval.pvs[0].moves[0]))
  }

  function makeComment(prev: Tree.Node, node: Tree.Node, path: Tree.Path): Comment {
    let verdict: Verdict
    let best: Uci | undefined | null
    const over = root.gameOver(node)

    if (over === 'checkmate') verdict = 'goodMove'
    else {
      const nodeEval: Eval = tbhitToEval(node.tbhit) || (
        (node.threefold || over === 'draw') ? { cp: 0 } : node.ceval as Eval
      )
      const prevEval: Eval = tbhitToEval(prev.tbhit) || prev.ceval!
      const shift = -povDiff(root.bottomColor(), nodeEval, prevEval)

      best = nodeBestUci(prev)

      if (best === node.uci) best = null

      if (!best) verdict = 'goodMove'
      else if (shift < 0.025) verdict = 'goodMove'
      else if (shift < 0.06) verdict = 'inaccuracy'
      else if (shift < 0.14) verdict = 'mistake'
      else verdict = 'blunder'
    }

    return {
      prev,
      node,
      path,
      verdict,
      best: best ? {
        uci: best,
        san: nodeBestSan(prev)!,
      } : undefined
    }
  }

  function isMyTurn(): boolean {
    return root.turnColor() === root.bottomColor()
  }

  function checkCeval() {
    const node = root.node
    if (!running()) {
      comment(null)
      return redraw()
    }
    if (tablebaseGuaranteed(variant, node.fen) && !defined(node.tbhit)) return
    ensureCevalRunning()
    if (isMyTurn()) {
      const h = hinting()
      if (h) {
        h.uci = nodeBestUci(node) || h.uci
      }
    } else {
      comment(null)
      if (node.san && commentable(node, variant)) {
        const parentNode = root.tree.parentNode(root.path)
        if (commentable(parentNode, variant, +1)) comment(makeComment(parentNode, node, root.path))
        else {
          /*
           * Looks like the parent node didn't get enough analysis time
           * to be commentable :-/ it can happen if the player premoves
           * or just makes a move before the position is sufficiently analysed.
           * In this case, fall back to comparing to the position before,
           * Since computer moves are supposed to preserve eval anyway.
           */
          const olderNode = root.tree.parentNode(treePath.init(root.path))
          if (commentable(olderNode, variant, +1)) comment(makeComment(olderNode, node, root.path))
        }
      }
      if (!played() && playable(node, variant)) {
        root.playUci(nodeBestUci(node)!)
        played(true)
      } else redraw()
    }
  }

  function checkCevalOrTablebase() {
    ensureCevalRunning()
    if (tablebaseGuaranteed(variant, root.node.fen)) {
      root.explorer.fetchTablebaseHit(root.node.fen)
      .then(hit => {
        if (hit && root.node.fen === hit.fen) root.node.tbhit = hit
        checkCeval()
      })
      .catch(() => {
        if (!defined(root.node.tbhit)) root.node.tbhit = null
        checkCeval()
      })
    }
    else checkCeval()
  }

  function resume(reset?: boolean) {
    running(true)
    if (reset) {
      comment(null)
      root.jump('')
    } else {
      checkCevalOrTablebase()
    }
    redraw()
  }

  requestIdleCallback(checkCevalOrTablebase)

  return {
    onCeval: checkCeval,
    onJump() {
      played(false)
      hinting(null)
      detectThreefold(root.nodeList, root.node)
      checkCevalOrTablebase()
    },
    isMyTurn,
    comment,
    running,
    hinting,
    resume,
    playableDepth,
    reset() {
      comment(null)
      hinting(null)
    },
    preUserJump(from: Tree.Path, to: Tree.Path) {
      if (from !== to) {
        running(false)
        comment(null)
      }
    },
    postUserJump(from: Tree.Path, to: Tree.Path) {
      if (from !== to && isMyTurn()) resume()
    },
    onUserMove() {
      running(true)
    },
    playCommentBest() {
      const c = comment()
      if (!c) return
      root.jump(treePath.init(c.path))
      if (c.best) root.playUci(c.best.uci)
    },
    hint() {
      const best = root.node.ceval ? scan2uci(root.node.ceval.pvs[0].moves[0]) : null,
      prev = hinting()
      if (!best || (prev && prev.mode === 'move')) hinting(null)
      else hinting({
        mode: prev ? 'move' : 'piece',
        uci: best
      })
      redraw()
    },
    currentNode: () => root.node,
    bottomColor: root.bottomColor,
    pieceTheme: settings.general.theme.piece(),
    minimized,
    toggleWindow() {
      minimized(!minimized())
    },
  }
}
