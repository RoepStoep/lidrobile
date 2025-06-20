import { Dialog } from '@capacitor/dialog'
import { Toast } from '@capacitor/toast'
import debounce from 'lodash-es/debounce'
import router from '../../router'
import i18n, { formatDateTime } from '../../i18n'
import Draughtsground from '../../draughtsground/Draughtsground'
import * as cg from '../../draughtsground/interfaces'
import * as draughts from '../../draughts'
import * as draughtsFormat from '../../utils/draughtsFormat'
import { build as makeTree, path as treePath, ops as treeOps, TreeWrapper, Tree } from '../shared/tree'
import redraw from '../../utils/redraw'
import session from '../../session'
import settings from '../../settings'
import { handleXhrError, oppositeColor, hasNetwork, noop, animationDuration } from '../../utils'
import vibrate from '../../vibrate'
import sound from '../../sound'
import { toggleGameBookmark } from '../../xhr'
import socket, { SocketIFace } from '../../socket'
import { getVariantBoard, openingSensibleVariants } from '../../lidraughts/variant'
import { playerName as gamePlayerName } from '../../lidraughts/player'
import * as gameApi from '../../lidraughts/game'
import { AnalyseData, AnalyseDataWithTree, isOnlineAnalyseData } from '../../lidraughts/interfaces/analyse'
import { Study, findTag } from '../../lidraughts/interfaces/study'
import { Opening } from '../../lidraughts/interfaces/game'
import continuePopup, { Controller as ContinuePopupController } from '../shared/continuePopup'
import { NotesCtrl } from '../shared/round/notes'

import * as util from './util'
import { Autoplay } from './autoplay'
import CevalCtrl from './ceval/CevalCtrl'
import RetroCtrl, { IRetroCtrl } from './retrospect/RetroCtrl'
import { make as makePractice, PracticeCtrl } from './practice/practiceCtrl'
import ExplorerCtrl from './explorer/ExplorerCtrl'
import { IExplorerCtrl } from './explorer/interfaces'
import analyseMenu, { IMainMenuCtrl } from './menu'
import analyseSettings, { ISettingsCtrl } from './analyseSettings'
import ground from './ground'
import socketHandler from './analyseSocketHandler'
import { getCompChild } from './nodeFinder'
import { make as makeEvalCache, EvalCache } from './evalCache'
import { Source } from './interfaces'
import * as tabs from './tabs'
import StudyCtrl from './study/StudyCtrl'
import ForecastCtrl from './forecast/ForecastCtrl'
import { positionLooksLegit } from '~/utils/fen'

export default class AnalyseCtrl {

  settings: ISettingsCtrl
  menu: IMainMenuCtrl
  continuePopup: ContinuePopupController
  notes: NotesCtrl | null
  draughtsground!: Draughtsground
  autoplay: Autoplay
  ceval: CevalCtrl
  retro: IRetroCtrl | null
  practice: PracticeCtrl | null
  explorer: IExplorerCtrl
  tree: TreeWrapper
  evalCache: EvalCache
  study?: StudyCtrl
  forecast?: ForecastCtrl

  socket: SocketIFace

  // current tree state, cursor, and denormalized node lists
  path!: Tree.Path
  node!: Tree.Node
  nodeList!: Tree.Node[]
  mainline!: Tree.Node[]

  // state flags
  onMainline = true
  synthetic: boolean // false if coming from a real game
  ongoing: boolean // true if real game is ongoing

  // paths
  initialPath: Tree.Path
  gamePath?: Tree.Path
  contextMenu: Tree.Path | null = null

  // various view state flags
  replaying = false
  cgConfig?: cg.SetConfig
  analysisProgress = false
  retroGlowing = false
  showThreat = false
  formattedDate?: string

  private _currentTabIndex = 0

  private debouncedExplorerSetStep: () => void

  constructor(
    readonly data: AnalyseData,
    studyData: Study | undefined,
    readonly source: Source,
    readonly orientation: Color,
    readonly shouldGoBack: boolean,
    ply?: number,
    tabId?: string
  ) {
    this.synthetic = util.isSynthetic(data)
    this.ongoing = !this.synthetic && gameApi.playable(data)
    this.initialPath = treePath.root
    this.study = studyData !== undefined ? new StudyCtrl(studyData, this) : undefined
    this.forecast = data.forecast ? new ForecastCtrl(data) : undefined

    this._currentTabIndex = (!this.study || this.study.data.chapter.tags.length === 0) && this.synthetic ? 0 : 1

    if (settings.analyse.supportedVariants.indexOf(this.data.game.variant.key) === -1) {
      Toast.show({ text: `Analysis board does not support ${this.data.game.variant.name} variant.`, position: 'center', duration: 'short' })
      router.set('/')
    }

    this.tree = makeTree(treeOps.reconstruct(this.data.treeParts))

    this.settings = analyseSettings.controller(this)
    this.menu = analyseMenu.controller(this)
    this.continuePopup = continuePopup.controller()
    this.autoplay = new Autoplay(this)

    this.notes = session.isConnected() && this.data.game.speed === 'correspondence' ? new NotesCtrl(this.data) : null

    this.retro = null
    this.practice = null

    const cevalAllowed = (() => {
      const v = this.data.game.variant.key

      if (!gameApi.analysableVariants.includes(v)) {
        return false
      }

      const study = this.study && this.study.data
      if (study && !(study.chapter.features.computer || study.chapter.practice)) {
        return false
      }

      if (this.data.game.initialFen && !positionLooksLegit(this.data.game.initialFen, getVariantBoard(v).size)) {
        return false
      }

      return this.isOfflineOrNotPlayable()
    })()
    this.ceval = new CevalCtrl({
      allowed: cevalAllowed,
      variant: this.data.game.variant.key,
      multiPv: 1, // settings.analyse.cevalMultiPvs(),
      cores: settings.analyse.cevalCores(),
      hashSize: settings.analyse.cevalHashSize(),
      infinite: settings.analyse.cevalInfinite(),
    }, this.onCevalMsg)

    const explorerAllowed = false //!this.study || this.study.data.chapter.features.explorer
    this.explorer = ExplorerCtrl(this, explorerAllowed)
    this.debouncedExplorerSetStep = debounce(this.explorer.setStep, animationDuration(settings.game.animations()) + 50)

    const initPly = ply !== undefined ? ply : this.tree.lastPly()

    this.gamePath = (this.synthetic || this.ongoing) ? undefined :
      treePath.fromNodeList(treeOps.mainlineNodeList(this.tree.root))

    const mainline = treeOps.mainlineNodeList(this.tree.root)
    this.initialPath = treeOps.takePathWhile(mainline, n => n.ply <= initPly)
    this.setPath(this.initialPath)

    if (this.forecast && this.data.game.turns) {
      if (!this.initialPath) {
        this.initialPath = treeOps.takePathWhile(this.mainline, n => n.ply <= this.data.game.turns)
      }
      const gameNodeList = this.tree.getNodeList(this.initialPath)
      const skipNodes = this.tree.getCurrentNodesAfterPly(gameNodeList, this.mainline, this.data.game.turns)
      let skipSteps = 0
      for (const skipNode of skipNodes) {
        skipSteps += skipNode.uci ? (skipNode.uci.length - 2) / 2 : 1
      }
      this.forecast.skipSteps = skipSteps
    }

    if (this.data.game.createdAt) {
      this.formattedDate = formatDateTime(new Date(this.data.game.createdAt))
    }

    if (this.study) {
      this.socket = this.study.createSocket()
    } else if (
      !this.data.analysis &&
      session.isConnected() &&
      isOnlineAnalyseData(this.data) &&
      gameApi.analysable(this.data) &&
      this.data.url !== undefined &&
      this.data.player.version !== undefined
    ) {
      this.socket = socket.createGame(
        this.data.url.socket,
        this.data.player.version,
        socketHandler(this),
        this.data.url.round
      )
    } else {
      this.socket = socket.createAnalysis(socketHandler(this))
    }

    // forecast mode: reload when opponent moves
    if (!this.synthetic) {
      setTimeout(() => {
        this.socket.send('startWatching', this.data.game.id)
      }, 1000)
    }

    this.evalCache = makeEvalCache({
      variant: this.data.game.variant.key,
      canGet: this.canEvalGet,
      getNode: () => this.node,
      receive: this.onCevalMsg,
      socketIface: this.socket,
    })

    this.updateBoard()

    if (tabId) {
      const curTabIndex = this.currentTabIndex(this.availableTabs())
      const newTabIndex = this.availableTabs().findIndex(tab => tab.id === tabId)
      if (newTabIndex >= 0 && curTabIndex !== newTabIndex) {
        this.onTabChange(newTabIndex)
      }
    }

    if (this.currentTab(this.availableTabs()).id === 'explorer') {
      this.debouncedExplorerSetStep()
    }

    setTimeout(this.debouncedScroll, 250)
    setTimeout(this.initCeval, 1000)
  }

  canDrop = () => {
    return false
  }

  player = () => {
    return this.data.game.player
  }

  playerName(color: Color): string {
    const p = gameApi.getPlayer(this.data, color)
    return this.study ? findTag(this.study.data, color) || i18n('anonymous') : gamePlayerName(p)
  }

  topColor(): Color {
    return oppositeColor(this.bottomColor())
  }

  bottomColor(): Color {
    return this.settings.s.flip ? oppositeColor(this.data.orientation) : this.data.orientation
  }

  turnColor(): Color {
    return util.plyColor(this.node.ply)
  }

  availableTabs = (): ReadonlyArray<tabs.Tab> => {
    let val: ReadonlyArray<tabs.Tab> = [tabs.moves]

    if (this.study && this.study.data.chapter.tags.length > 0) val = [tabs.pdnTags, ...val]
    if (!this.synthetic) val = [tabs.gameInfos, ...val]
    // TODO enable only when study.canContribute() is false with write support
    if (this.study) val = [...val, tabs.comments]
    if (!this.retro && !this.practice && this.ceval.enabled()) val = [...val, tabs.ceval]
    if (this.study || (isOnlineAnalyseData(this.data) && gameApi.analysable(this.data))) {
      val = [...val, tabs.charts]
    }
    if (hasNetwork() && this.explorer.allowed) val = [...val, tabs.explorer]

    return val
  }

  currentTabIndex = (avail: ReadonlyArray<tabs.Tab>): number => {
    if (this._currentTabIndex > avail.length - 1) return avail.length - 1
    else return this._currentTabIndex
  }

  currentTab = (avail: ReadonlyArray<tabs.Tab>): tabs.Tab => {
    return avail[this.currentTabIndex(avail)]
  }

  onTabChange = (index: number) => {
    this._currentTabIndex = index
    const cur = this.currentTab(this.availableTabs())
    this.updateHref()
    if (cur.id === 'moves') this.debouncedScroll()
    else if (cur.id === 'explorer') this.explorer.setStep()
    redraw()
  }

  // call this when removing a tab, to avoid a lazy tab loading indefinitely
  resetTabs = () => this.onTabChange(this.currentTabIndex(this.availableTabs()))

  setPath = (path: Tree.Path): void => {
    this.path = path
    this.nodeList = this.tree.getNodeList(path)
    this.node = treeOps.last(this.nodeList) as Tree.Node
    this.mainline = treeOps.mainlineNodeList(this.tree.root)
    this.onMainline = this.tree.pathIsMainline(path)
  }

  promote(path: Tree.Path, toMainline: boolean): void {
    this.tree.promoteAt(path, toMainline)
    this.contextMenu = null
    this.jump(path)
  }

  deleteNode(path: Tree.Path): void {
    const node = this.tree.nodeAtPath(path)
    if (!node) return
    const count = treeOps.countChildrenAndComments(node)
    if (count.nodes >= 10 || count.comments > 0) {
      Dialog.confirm({
        title: 'Confirm',
        message: `Delete ${count.nodes} move(s)` + (count.comments ? ` and ${count.comments} comment(s)` : '') + '?',
      })
      .then(() => this._deleteNode(path))
    } else {
      this._deleteNode(path)
    }
  }

  initCeval = () => {
    if (this.ceval.enabled()) {
      if (this.ceval.isInit()) {
        this.debouncedStartCeval()
      } else {
        this.ceval.init().then(this.debouncedStartCeval)
      }
    }
  }

  startCeval = () => {
    if (this.ceval.enabled()) {
      if (this.canUseCeval()) {
        // only analyze startingposition of multicaptures
        const ghostEnd = (this.nodeList.length > 0 && this.node.displayPly && this.node.displayPly !== this.node.ply)
        const path = ghostEnd ? this.path.slice(2) : this.path
        const nodeList = ghostEnd ? this.nodeList.slice(1) : this.nodeList
        const forceMaxDepth = !!(this.retro || this.practice)
        this.ceval.start(this.showThreat, path, nodeList, forceMaxDepth, false)
        this.evalCache.fetch(path, forceMaxDepth ? 1 : this.ceval.getMultiPv())
      } else this.stopCevalImmediately()
    }
  }

  stopCevalImmediately = () => {
    this.ceval.stop()
    this.debouncedStartCeval.cancel()
  }

  toggleRetro = (fromBB?: string): void => {
    if (this.retro) {
      if (fromBB !== 'backbutton') router.backbutton.stack.pop()
      this.retro = null
      // start ceval after retro close only if enabled by stored settings
      if (settings.analyse.enableCeval()) {
        this.startCeval()
      }
      // else disable it
      else {
        this.ceval.disable()
      }
    } else {
      this.stopCevalImmediately()
      if (this.practice) this.practice = null
      this.retro = RetroCtrl(this)
      router.backbutton.stack.push(this.toggleRetro)
      this.retro.jumpToCurrent()
    }
  }

  private practiceDepth = () => {
    const v = this.data.game.variant.key
    const baseDepth = v === 'antidraughts' ? 8 : 20
    const pieceCount = util.pieceCount(this.node.fen)
    if (pieceCount <= 5) {
      if (v === 'antidraughts') return baseDepth + 2
      else if (v === 'frisian' || v === 'frysk') return baseDepth + 8
      return baseDepth + 5
    } else if (pieceCount <= 10) {
      if (v === 'antidraughts') return baseDepth + 1
      else if (v === 'frisian' || v === 'frysk') return baseDepth + 5
      return baseDepth + 3
    }
    return baseDepth
  }

  togglePractice = () => {
    if (this.practice || !this.ceval.allowed) this.practice = null
    else {
      if (this.retro) this.retro = null
      this.practice = makePractice(this, this.practiceDepth)
    }
  }

  toggleShowThreat = (): void => {
    if (!this.ceval.allowed) return
    if (!this.ceval.enabled()) this.ceval.toggle()
    this.showThreat = !this.showThreat
    this.startCeval()
  }

  restartPractice() {
    this.practice = null
    this.togglePractice()
  }

  debouncedScroll = debounce(() => util.autoScroll(document.getElementById('replay')), 200)

  jump = (path: Tree.Path, direction?: 'forward' | 'backward') => {
    const pathChanged = path !== this.path
    const oldPly = this.node.displayPly ? this.node.displayPly : this.node.ply
    this.setPath(path)
    this.updateBoard(Math.abs(oldPly - (this.node.displayPly ? this.node.displayPly : this.node.ply)) > 1)
    this.fetchOpening()
    if (this.node && this.node.san && direction === 'forward') {
      if (this.node.san.indexOf('x') !== -1) sound.throttledCapture()
      else sound.throttledMove()
    }
    this.ceval.stop()
    this.debouncedExplorerSetStep()
    this.updateHref()
    if (pathChanged) {
      if (this.retro) this.retro.onJump()
      if (this.practice) this.practice.onJump()
      this.debouncedStartCeval()
    }
  }

  userJump = (path: Tree.Path, direction?: 'forward' | 'backward') => {
    this.autoplay.stop()
    if (this.practice) {
      const prev = this.path
      this.practice.preUserJump(prev, path)
      this.jump(path, direction)
      this.practice.postUserJump(prev, this.path)
    } else this.jump(path, direction)
  }

  jumpToMain = (ply: number) => {
    this.userJump(this.mainlinePathToPly(ply))
  }

  jumpToIndex = (index: number) => {
    this.jumpToMain(index + 1 + (this.data.game.startedAtTurn || 0))
  }

  canGoForward = () => {
    return this.node.children.length > 0
  }

  next = () => {
    if (!this.canGoForward()) return false

    const child = this.node.children[0]
    if (child) this.userJump(this.path + child.id, 'forward')

    return true
  }

  fastforward = () => {
    this.replaying = true
    const more = this.next()
    if (!more) {
      this.replaying = false
      this.debouncedScroll()
    }
    return more
  }

  stopff = () => {
    this.replaying = false
    this.next()
    this.debouncedScroll()
  }

  rewind = () => {
    this.replaying = true
    const more = this.prev()
    if (!more) {
      this.replaying = false
      this.debouncedScroll()
    }
    return more
  }

  stoprewind = () => {
    this.replaying = false
    this.prev()
    this.debouncedScroll()
  }

  toggleBookmark = () => {
    return toggleGameBookmark(this.data.game.id).then(() => {
      this.data.bookmarked = !this.data.bookmarked
      redraw()
    })
    .catch(handleXhrError)
  }

  getChartData() {
    const d = this.data
    return {
      analysis: d.analysis,
      game: d.game,
      player: d.player,
      opponent: d.opponent,
      treeParts: treeOps.mainlineNodeList(this.tree.root)
    }
  }

  playUci = (uci: Uci): void => {
    const move = draughtsFormat.decomposeUci(uci)
    this.sendMove(move[0], move[move.length - 1], move.length > 2 ? uci : undefined)
    this.explorer.loading(true)
  }

  mergeAnalysisData(data: AnalyseDataWithTree): void {
    if (!this.analysisProgress) {
      this.analysisProgress = true
      redraw()
    }
    this.tree.merge(data.tree)
    this.data.analysis = data.analysis
    const anaMainline = treeOps.mainlineNodeList(data.tree)
    const analysisComplete = this.isFullAnalysis(anaMainline)
    if (analysisComplete) {
      this.analysisProgress = false
      this.retroGlowing = true
      setTimeout(() => {
        this.retroGlowing = false
        redraw()
      }, 1000 * 8)
      sound.dong()
      vibrate.quick()
      redraw()
    }
    if (this.retro) this.retro.onMergeAnalysisData()
    redraw()
  }

  gameOver(node?: Tree.Node): 'draw' | 'checkmate' | false {
    const n = node || this.node
    if (!n?.end || (n.dests !== '' && !util.isEmptyObject(n.dests))) return false
    return n.draw ? 'draw' : 'checkmate'
  }

  canUseCeval = () => {
    return !this.gameOver()
  }

  private pickUci(compChild?: Tree.Node, nextBest?: string) {
    if (!nextBest)
      return undefined
    else if (!!compChild && compChild.uci && compChild.uci.length > nextBest.length && compChild.uci.slice(0, 2) === nextBest.slice(0, 2) && compChild.uci.slice(compChild.uci.length - 2) === nextBest.slice(nextBest.length - 2))
      return compChild.uci
    else
      return nextBest
  }

  nextNodeBest() {
    return treeOps.withMainlineChild(this.node, (n: Tree.Node) => n.eval ? this.pickUci(getCompChild(this.node), n.eval.best) : undefined)
  }

  mainlinePathToPly(ply: Ply): Tree.Path {
    return treeOps.takePathWhile(this.mainline, n => (n.displayPly ? n.displayPly : n.ply) <= ply)
  }

  hasAnyComputerAnalysis = () => {
    return this.data.analysis || this.ceval.enabled()
  }

  hasFullComputerAnalysis = (): boolean => {
    return this.isFullAnalysis(this.mainline)
  }

  private isFullAnalysis(nodes: Tree.Node[]) {
    let count = 0
    for (let i = 0; i < nodes.length - 2; i++) {
      const skip = i > 0 && nodes[i].ply === nodes[i - 1].ply
      if (!skip) {
        count++
        if (count > 200) return true // max 200 ply of analysis
        const e = nodes[i].eval
        if (!e || !Object.keys(e).length)
          return false
      }
    }
    return true
  }

  isOfflineOrNotPlayable = (): boolean => {
    return this.source === 'offline' ||
      !!(this.study && this.study.data) ||
      !gameApi.playable(this.data)
  }

  unload = () => {
    this.autoplay.stop()
    if (this.ceval) this.ceval.destroy()
  }

  // ---

  private _deleteNode = (path: Tree.Path) => {
    this.tree.deleteNodeAt(path)
    this.contextMenu = null
    if (treePath.contains(this.path, path)) this.userJump(treePath.init(path))
    else this.jump(this.path)
  }

  private updateHref = debounce(() => {
    router.setQueryParams({
      tabId: this.currentTab(this.availableTabs()).id,
      ply: String(this.node.ply),
      curFen: this.node.fen,
      variant: this.data.game.variant.key
    })
  }, 200)

  private prev() {
    this.userJump(treePath.init(this.path), 'backward')

    return true
  }

  private canEvalGet = (node: Tree.Node): boolean => node.ply < 15

  private sendMove = (orig: Key, dest: Key, uci?: string) => {
    const move: draughts.MoveRequest = {
      orig,
      dest,
      uci,
      variant: this.data.game.variant.key,
      fen: this.node.fen,
      path: this.path,
      fullCapture: settings.analyse.fullCapture()
    }
    if (this.practice) this.practice.onUserMove()
    draughts.move(move)
    .then(this.addNode)
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

  private addNode = ({ situation, path }: draughts.MoveResponse) => {
    const curNode = this.node
    const node = {
      id: situation.id,
      ply: situation.ply,
      fen: situation.fen,
      children: [],
      dests: situation.dests,
      destsUci: situation.destsUci,
      drops: situation.drops,
      captLen: situation.captureLength,
      end: situation.end,
      draw: situation.draw,
      player: situation.player,
      uci: situation.uci,
      san: situation.san,
      pdnMoves: curNode && curNode.pdnMoves ? curNode.pdnMoves.concat(situation.pdnMoves) : situation.pdnMoves
    }
    if (path === undefined) {
      console.error('Cannot addNode, missing path', node)
      return
    }
    const newPath = this.tree.addNode(node, path)
    if (!newPath) {
      console.error('Cannot addNode', node, path)
      return
    }
    this.jump(newPath)
    this.debouncedScroll()
    redraw()
  }

  isAlgebraic(): boolean {
    const board = this.data.game.variant.board || getVariantBoard(this.data.game.variant.key)
    return settings.game.coordSystem() === 1 && board.key === '64'
  }

  coordSystem(): number {
    return this.isAlgebraic() ? 1 : 0
  }

  private onCevalMsg = (path: string, ev?: Tree.ClientEval, isThreat?: boolean) => {
    if (ev) {
      this.tree.updateAt(path, (node: Tree.Node) => {
        if (node.fen !== ev.fen && !isThreat) return

        if (isThreat) {
          const threat = ev 
          if (!node.threat || util.isEvalBetter(threat, node.threat) || node.threat.maxDepth! < threat.maxDepth!) {
            node.threat = threat
          } else if (ev.knps) {
            node.threat.knps = ev.knps
          }
        }
        else if (!node.ceval || util.isEvalBetter(ev, node.ceval)) node.ceval = ev
        else if (!ev.cloud) {
          if (node.ceval.cloud && this.ceval.isDeeper) node.ceval = ev
          else {
            if (ev.knps) node.ceval.knps = ev.knps
            if (ev.maxDepth! > node.ceval.maxDepth!) node.ceval.maxDepth = ev.maxDepth
          }
        }

        if (node.ceval && node.ceval.pvs.length > 0) {
          node.ceval.best = node.ceval.pvs[0].moves[0]
        }

        if (path === this.path) {
          if (this.retro) this.retro.onCeval()
          if (this.practice) this.practice.onCeval()
          if (ev.cloud && ev.depth >= this.ceval.effectiveMaxDepth()) {
            this.ceval.stop()
          }
          redraw()
        }
      })
    }
    // no ceval means scan has finished, just redraw
    else {
      if (this.currentTab(this.availableTabs()).id === 'ceval') redraw()
    }
  }

  private debouncedStartCeval = debounce(this.startCeval, 500, { trailing: true })

  private updateBoard(noCaptSequences = false) {
    const node = this.node

    const color: Color = util.plyColor(node.ply)
    const dests = draughtsFormat.readDests(node.dests)
    const board = this.data.game.variant.board || getVariantBoard(this.data.game.variant.key)
    const config = {
      fen: node.fen,
      boardSize: board.size,
      variant: this.data.game.variant.key,
      coordinates: settings.game.coords(),
      coordSystem: this.coordSystem(),
      turnColor: color,
      orientation: this.settings.s.flip ? oppositeColor(this.orientation) : this.orientation,
      movableColor: this.gameOver() ? null : color,
      dests: dests || null,
      captureLength: node.captLen,
      captureUci: (settings.analyse.fullCapture() && this.node.destsUci && this.node.destsUci.length) ? this.node.destsUci.concat() : undefined,
      lastMove: node.uci ? draughtsFormat.uciToMoveOrDrop(node.uci) : null
    }

    this.cgConfig = config
    this.data.game.player = color
    if (!this.draughtsground) {
      this.draughtsground = ground.make(config, this.orientation, this.userMove)
    } else {
      this.draughtsground.set(config, noCaptSequences)
    }

    if (!dests) this.getNodeSituation()
  }

  private getNodeSituation = debounce(() => {
    if (this.node && !this.node.dests) {
      draughts.situation({
        variant: this.data.game.variant.key,
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
          if (this.gameOver()) this.stopCevalImmediately()
        }
      })
      .catch(err => console.error('get dests error', err))
    }
  }, 50)

  private fetchOpening = debounce(() => {
    if (
      hasNetwork() && this.node && this.node.opening === undefined &&
      this.node.ply <= 20 && this.node.ply > 0 &&
      openingSensibleVariants.has(this.data.game.variant.key)
    ) {
      const msg: { fen: string, path: string, variant?: VariantKey } = {
        fen: this.node.fen,
        path: this.path
      }
      const variant = this.data.game.variant.key
      if (variant !== 'standard') msg.variant = variant
      this.tree.updateAt(this.path, (node: Tree.Node) => {
        // flag opening as null in any case to not request twice
        node.opening = null
        this.socket.ask<{ opening: Opening, path: string }>('opening', 'opening', msg)
        .then(d => {
          if (d.opening && d.path) {
            node.opening = d.opening
            if (d.path === this.path) redraw()
          }
        })
        .catch(noop)
      })
    }
  }, 50)
}
