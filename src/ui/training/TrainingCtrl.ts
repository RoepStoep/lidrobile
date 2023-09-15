import { Share } from '@capacitor/share'
import debounce from 'lodash-es/debounce'
import throttle from 'lodash-es/throttle'
import Draughtsground from '../../draughtsground/Draughtsground'
import { build as makeTree, ops as treeOps, path as treePath, TreeWrapper, Tree } from '../shared/tree'
import router from '../../router'
import { ErrorResponse } from '../../http'
import redraw from '../../utils/redraw'
import { hasNetwork, handleXhrError } from '../../utils'
import signals from '../../signals'
import * as draughts from '../../draughts'
import * as draughtsFormat from '../../utils/draughtsFormat'
import session from '../../session'
import sound from '../../sound'
import settings from '../../settings'
import { PuzzleData } from '../../lidraughts/interfaces/training'
import { PromotingInterface } from '../shared/round'

import moveTest from './moveTest'
import makeGround from './ground'
import { getVariant } from '../../lidraughts/variant'
import menu, { IMenuCtrl } from './menu'
import * as xhr from './xhr'
import { VM, Data, PimpedGame, Feedback } from './interfaces'
import { getUnsolved, syncPuzzleResult, syncAndLoadNewPuzzle, syncAndClearCache, nbRemainingPuzzles, puzzleLoadFailure } from './offlineService'
import { Database } from './database'
import trainingSettings, { ISettingsCtrl } from './trainingSettings'
import { countGhosts } from '../../draughtsground/fen'
import { animationDuration } from '../../draughtsground/anim'

export default class TrainingCtrl implements PromotingInterface {
  data!: Data
  settings: ISettingsCtrl
  menu: IMenuCtrl
  draughtsground!: Draughtsground
  database: Database

  // current tree state, cursor, and denormalized node lists
  path!: Tree.Path
  node!: Tree.Node
  nodeList!: Tree.Node[]
  mainline!: Tree.Node[]
  initialPath!: Tree.Path
  initialNode!: Tree.Node

  nbUnsolved!: number

  vm!: VM

  private tree!: TreeWrapper
  private initialData!: PuzzleData

  constructor(cfg: PuzzleData, database: Database) {
    this.menu = menu.controller(this)
    this.database = database

    this.init(cfg)

    this.settings = trainingSettings.controller(this)

    signals.afterLogin.add(this.retry)
  }

  public player = (): Color => this.data.puzzle.color

  public viewSolution = (): void => {
    if (!this.vm.canViewSolution) return
    this.sendResult(false)
    this.vm.mode = 'view'
    const merged = this.mergeSolution(this.data.puzzle.branch, this.data.puzzle.color)

    // try and play the solution next move
    const next = this.node.children[0]
    if (merged) this.userJump(this.path.substr(0, this.path.length - 1) + merged.id.substr(1), true)
    else if (next && next.puzzle === 'good') this.userJump(this.path + next.id, true)
    else {
      const firstGoodPath = treeOps.takePathWhile(this.mainline, node => {
        return node.puzzle !== 'good'
      })
      if (firstGoodPath) {
        this.userJump(firstGoodPath + this.tree.nodeAtPath(firstGoodPath).children[0].id, true)
      }
    }

    redraw()
  }

  isAlgebraic(): boolean {
    return settings.game.coordSystem() === 1 && this.data.puzzle.variant.board && this.data.puzzle.variant.board.key === '64'
  }
  
  coordSystem(): number {
    return this.isAlgebraic() ? 1 : 0
  }

  public setPath = (path: Tree.Path): void => {
    this.path = path
    this.nodeList = this.tree.getNodeList(path)
    this.node = treeOps.last(this.nodeList) as Tree.Node
    this.mainline = treeOps.mainlineNodeList(this.tree.root)
  }

  public jump = (path: Tree.Path, withSound = false): void => {
    const pathChanged = path !== this.path
    this.setPath(path)
    this.updateBoard()
    if (pathChanged && withSound) {
      if (this.node.san && this.node.san.indexOf('x') !== -1) sound.throttledCapture()
      else sound.throttledMove()
    }
  }

  public userJump = (path: Tree.Path, withSound: boolean): void => {
    this.jump(path, withSound)
  }

  public canGoForward = (): boolean => {
    return !this.vm.initializing && this.node.children.length > 0
  }

  public fastforward = (): boolean => {
    if (this.node.children.length === 0) return false

    const child = this.node.children[0]
    this.userJump(this.path + child.id, true)
    return true
  }

  public canGoBackward = (): boolean => {
    if (this.vm.moveValidationPending) return false
    if (this.path === '') return false
    return true
  }

  public resync = (): void => {
    const user = session.get()
    if (hasNetwork() && user) {
      if (this.vm.loading) {
        return
      }
      this.vm.loading = true
      this.settings.close()
      redraw()
      const onSuccess = (cfg: PuzzleData) => {
        this.vm.loading = false
        this.init(cfg)
        redraw()
      }
      syncAndClearCache(this.database, user, this.vm.variant)
      .then(onSuccess)
      .catch(error => {
        this.vm.loading = false
        redraw()
        puzzleLoadFailure(error)
      })
    }
  }

  public rewind = (): boolean => {
    if (this.canGoBackward()) {
      this.userJump(treePath.init(this.path), false)
      return true
    }

    return false
  }

  public newPuzzle = (): void => {
    if (this.vm.loading) {
      return
    }
    this.vm.loading = true
    redraw()

    const onSuccess = (cfg: PuzzleData) => {
      this.vm.loading = false
      this.init(cfg)
      redraw()
    }
    const user = session.get()
    if (user) {
      syncAndLoadNewPuzzle(this.database, user, this.vm.variant)
      .then(onSuccess)
      .catch(error => {
        this.vm.loading = false
        redraw()
        puzzleLoadFailure(error)
      })
    } else {
      xhr.newPuzzle(this.vm.variant)
      .then(onSuccess)
      .catch(this.onXhrError)
    }
  }

  public retry = (): void => {
    if (!this.vm.loading) {
      this.init(this.initialData)
    }
  }

  public upvote = (): void => {
    this.vote(true)
  }

  public downvote = (): void => {
    this.vote(false)
  }

  public vote = throttle((v: boolean) => {
    this.vm.voted = v
    xhr.vote(this.data.puzzle.id, v, this.data.puzzle.variant.key).then((res) => {
      this.vm.vote = res[1]
      redraw()
    })
  }, 1000)

  public getVotes = () => {
    return this.vm.vote
  }

  public share = (): void => {
    Share.share({ url: `https://lidraughts.org/training/${this.data.puzzle.variant.key}/${this.data.puzzle.id}` })
  }

  public goToAnalysis = (): void => {
    const puzzle = this.data.puzzle
    if (hasNetwork() && puzzle.gameId !== 'custom') {
      router.set(`/analyse/online/${puzzle.gameId}/${puzzle.color}?ply=${puzzle.initialPly}&curFen=${puzzle.fen}&color=${puzzle.color}&variant=${puzzle.variant.key}}&fallback=1`)
    } else {
      router.set(`/analyse/variant/${this.data.puzzle.variant.key}/fen/${encodeURIComponent(this.initialNode.fen)}?color=${puzzle.color}&goBack=1`)
    }
  }

  // --

  private init(cfg: PuzzleData) {
    if (cfg.puzzle.variant.key && !cfg.puzzle.variant.board) {
      const variantData = getVariant(cfg.puzzle.variant.key)
      cfg.puzzle.variant.board = variantData.board
    }

    this.initialData = cfg

    router.History.replaceState({ puzzleId: cfg.puzzle.id }, `/training/${cfg.puzzle.id}/variant/${cfg.puzzle.variant.key}`)

    this.vm = {
      mode: 'play',
      variant: cfg.puzzle.variant.key,
      initializing: true,
      lastFeedback: 'init',
      moveValidationPending: false,
      loading: false,
      canViewSolution: false,
      resultSent: false,
      voted: null,
      vote: cfg.puzzle.vote,
    }

    const user = session.get()
    if (user) {
      nbRemainingPuzzles(this.database, user, cfg.puzzle.variant.key)
      .then(nb => {
        this.nbUnsolved = nb
        redraw()
      })
    }

    const data = JSON.parse(JSON.stringify(cfg))
    const pimpedGame: PimpedGame | undefined = data.game ? { ...data.game, variant: data.puzzle.variant } : undefined
    const pimpedData: Data = { ...data, game: pimpedGame }

    this.data = pimpedData

    this.tree = makeTree((this.data.game && this.data.game.treeParts) ? 
      treeOps.reconstruct([
        // make root node with puzzle initial state
        {
          fen: this.data.puzzle.fen,
          ply: this.data.puzzle.initialPly - 1,
          id: '',
          children: []
        },
        this.data.game.treeParts
      ]) : ({
        id: '',
        ply: data.history!.ply - 1,
        fen: data.puzzle.fen,
        children: [
          {
            id: data.history!.id,
            ply: data.history!.ply,
            fen: data.history!.fen,
            san: data.history!.san,
            uci: data.history!.uci,
            children: []
          } as Tree.Node
        ]
      } as Tree.Node)
    )
    this.initialPath = treePath.fromNodeList(treeOps.mainlineNodeList(this.tree.root))
    this.initialNode = this.tree.nodeAtPath(this.initialPath)
    this.setPath(treePath.init(this.initialPath))
    this.updateBoard()

    // play opponent first move with delay
    setTimeout(() => {
      this.jump(this.initialPath, true)
      this.vm.initializing = false
    }, 1000)

    setTimeout(() => {
      this.vm.canViewSolution = true
      redraw()
    }, 5000)

    redraw()
  }

  private updateBoard() {
    const node = this.node
    const color: Color = node.ply % 2 === 0 ? 'white' : 'black'
    const dests = draughtsFormat.readDests(node.dests)
    const board = this.data.puzzle.variant.board || getVariant(this.data.puzzle.variant.key).board
    const config = {
      fen: node.fen,
      boardSize: board.size,
      variant: this.data.puzzle.variant.key,
      coordSystem: this.coordSystem(),
      turnColor: color,
      orientation: this.data.puzzle.color,
      movableColor: this.gameOver() ? null : this.data.puzzle.color,
      dests: dests || null,
      captureLength: node.captLen,
      captureUci: (settings.analyse.fullCapture() && this.node.destsUci && this.node.destsUci.length) ? this.node.destsUci.concat() : undefined,
      lastMove: node.uci ? draughtsFormat.uciToMove(node.uci) : null
    }

    if (!this.draughtsground) {
      this.draughtsground = new Draughtsground(makeGround(this, this.userMove))
    } else {
      this.draughtsground.set(config)
    }

    if (!dests) this.getNodeSituation()
  }

  private getNodeSituation = debounce(() => {
    if (this.node && !this.node.dests) {
      draughts.situation({
        variant: this.data.puzzle.variant.key,
        fen: this.node.fen,
        uci: this.node.uci,
        path: this.path,
        fullCapture: settings.analyse.fullCapture()
      })
      .then(({ situation, path }) => {
        this.tree.updateAt(path, (node: Tree.Node) => {
          node.dests = situation.dests
          node.destsUci = situation.destsUci
          node.captLen = situation.captureLength
          node.end = situation.end
          node.draw = situation.draw
          node.player = situation.player
        })
        if (path === this.path) {
          this.updateBoard()
          redraw()
        }
      })
      .catch(err => console.error('get dests error', err))
    }
  }, 50)

  private gameOver(): boolean {
    if (!this.node) return false
    if (this.vm.mode === 'view') return true
    return !!this.node.end
  }

  private sendMove = (orig: Key, dest: Key, uci?: string) => {
    const move: draughts.MoveRequest = {
      orig,
      dest,
      uci,
      variant: this.data.puzzle.variant.key,
      fen: this.node.fen,
      path: this.path,
      pdnMoves: this.node.pdnMoves,
      fullCapture: settings.analyse.fullCapture()
    }
    this.sendMoveRequest(move, true)
  }

  private sendMoveRequest = (move: draughts.MoveRequest, userMove = false) => {
    draughts.move(move)
    .then(({ situation, path}) => {
      const node = {
        id: situation.id,
        ply: situation.ply,
        fen: situation.fen,
        uci: situation.uci,
        children: [],
        dests: situation.dests,
        destsUci: situation.destsUci,
        captLen: situation.captureLength,
        kingMoves: situation.kingMoves,
        end: situation.end,
        draw: situation.draw,
        player: situation.player,
        san: situation.san,
        pdnMoves: situation.pdnMoves
      }
      if (path === undefined) {
        console.error('Cannot addNode, missing path', node)
        return
      }
      const newPath = this.tree.addNode(node, path)
      if (!newPath) {
        // path can be undefined when solution is clicked in the middle of opponent capt sequence
        return
      }
      const ghosts = countGhosts(situation.fen)
      if (userMove && !ghosts) this.vm.moveValidationPending = true
      this.jump(newPath, !userMove)
      redraw()

      const playedByColor = this.node.ply % 2 === 1 ? 'white' : 'black'
      if (playedByColor === this.data.puzzle.color) {
        const progress = moveTest(
          this.vm.mode, this.node, this.path, this.initialPath, this.nodeList,
          this.data.puzzle
        )
        if (progress) this.applyProgress(progress, ghosts !== 0)
      }
    })
    .catch(err => console.error('send move error', move, err))
  }

  private userMove = (orig: Key, dest: Key, captured?: Piece) => {
    if (captured) sound.capture()
    else sound.move()
    if (settings.analyse.fullCapture() && this.node.destsUci) {
      const uci = this.node.destsUci.find(u => u.slice(0, 2) === orig && u.slice(-2) === dest)
      if (uci) {
        this.sendMove(orig, dest, uci)
        return    
      }
    }
    this.sendMove(orig, dest)
  }

  private revertUserMove = (path: Tree.Path) => {
    setTimeout(() => {
      this.vm.moveValidationPending = false
      this.userJump(treePath.init(path), false)
      this.tree.deleteNodeAt(path)
      redraw()
    }, 500)
  }

  private applyProgress = (progress: Feedback | draughts.MoveRequest, contd: boolean) => {
    if (progress === 'fail') {
      this.vm.lastFeedback = 'fail'
      this.revertUserMove(this.path)
      if (this.vm.mode === 'play') {
        this.vm.canViewSolution = true
        this.vm.mode = 'try'
        this.sendResult(false)
      }
    } else if (progress === 'retry') {
      this.vm.lastFeedback = 'retry'
      this.revertUserMove(this.path)
    } else if (progress === 'win') {
      this.vm.moveValidationPending = false
      if (this.vm.mode !== 'view') {
        if (this.vm.mode === 'play') this.sendResult(true)
        this.vm.lastFeedback = 'win'
        this.vm.mode = 'view'
      }
    } else if (isMoveRequest(progress)) {
      this.vm.moveValidationPending = false
      this.vm.lastFeedback = 'good'
      const duration = animationDuration(this.draughtsground.state),
        delay = !contd ? Math.max(500, duration) : duration
      setTimeout(() => {
        // play opponent move
        this.sendMoveRequest(progress)
      }, Math.max(300, delay))
    }
  }

  private mergeSolution(solution: Tree.Node, color: Color) {

    const updateNode = (node: Tree.Node) => {
      if ((color === 'white') === ((node.displayPly ? node.displayPly : node.ply) % 2 === 1)) node.puzzle = 'good'
    }

    const mergedSolution = treeOps.mergeExpandedNodes(solution)
    treeOps.updateAll(mergedSolution, updateNode)

    const solutionNode = treeOps.childById(this.initialNode, mergedSolution.id)

    let merged: Tree.Node | undefined = undefined
    if (solutionNode) {
      merged = treeOps.merge(solutionNode, mergedSolution, solution)
      if (merged) treeOps.updateAll(merged, updateNode)
    } else this.initialNode.children.push(mergedSolution)

    return merged
  }

  private sendResult = (win: boolean) => {
    if (this.vm.resultSent) return
    this.vm.resultSent = true
    const user = session.get()
    const variant = this.data.puzzle.variant.key
    const outcome = { id: this.data.puzzle.id, win, variant }

    const roundReq = () => {
      xhr.round(outcome)
      .then((res) => {
        this.vm.voted = res.voted
        this.data.user = res.user
        redraw()
      })
      .catch(err => {
        if (hasNetwork()) {
          handleXhrError(err)
        }
        this.vm.resultSent = false
      })
    }

    if (user) {
      getUnsolved(this.database, user, variant)
      .then(puzzles => {
        // if puzzle is in the unsolved queue let's sync it using batch endpoint
        // a puzzle may have been loaded from database, or from xhr if it has
        // been loaded by id
        if (puzzles.find(p => p.puzzle.id === this.data.puzzle.id)) {
          syncPuzzleResult(this.database, user, outcome)
          .then(newData => {
            if (newData && newData.user) {
              this.data.user = newData.user
              redraw()
            }
          })
        } else {
          roundReq()
        }
      })
    } else {
      roundReq()
    }

  }

  private onXhrError = (res: ErrorResponse) => {
    this.vm.loading = false
    redraw()
    handleXhrError(res)
  }
}

function isMoveRequest(v: Feedback | draughts.MoveRequest): v is draughts.MoveRequest {
  return (v as draughts.MoveRequest).variant !== undefined
}
