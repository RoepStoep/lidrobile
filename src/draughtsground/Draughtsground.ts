import * as cg from './interfaces'
import * as util from './util'
import * as board from './board'
import { State } from './state'
import { initBoard, configureBoard, setNewBoardState } from './configure'
import fen from './fen'
import { renderBoard, makeCoords, makeFieldnumbers } from './render'
import { anim, skip as skipAnim } from './anim'
import * as drag from './drag'

const pieceScores = {
  man: 1,
  king: 2,
  ghostman: 0,
  ghostking: 0
};

export default class Draughtsground {
  public state: State
  public dom?: cg.DOM

  private resizeTimeoutId: number = 0

  constructor(cfg: cg.InitConfig) {
    this.state = initBoard(cfg)
  }

  attach(wrapper: HTMLElement) {
    const isViewOnly = this.state.fixed || this.state.viewOnly
    const board = document.createElement('div')
    board.className = 'cg-board'
    if (isViewOnly) board.className += ' view-only'
    else board.className += ' manipulable'

    wrapper.appendChild(board)

    this.dom = {
      board,
      elements: {},
      bounds: this.state.fixed ? {
        // dummy bounds since fixed board doesn't use bounds
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        height: 0,
        width: 0
      } : wrapper.getBoundingClientRect()
    }

    this.redrawSync()

    if (!isViewOnly) {
      const shadow = document.createElement('div')
      shadow.className = 'cg-square-target'
      shadow.style.transform = util.translate3dAway
      wrapper.appendChild(shadow)
      this.dom.elements.shadow = shadow
    }

    if (!isViewOnly && this.state.draggable.showGhost) {
      const ghost = document.createElement('piece')
      ghost.className = 'ghost'
      ghost.style.transform = util.translateAway
      wrapper.appendChild(ghost)
      this.dom.elements.ghost = ghost
    }

    if (this.state.coordinates === 2) {
      makeCoords(wrapper, this.state.boardSize, this.state.orientation, this.dom, this.state.coordSystem)
    } else if (this.state.coordinates === 1) {
      makeFieldnumbers(this.state, this.dom);
    }

    if (!isViewOnly) {
      board.addEventListener('touchstart', (e: TouchEvent) => drag.start(this, e))
      board.addEventListener('touchmove', (e: TouchEvent) => drag.move(this, e))
      board.addEventListener('touchend', (e: TouchEvent) => drag.end(this, e))
      board.addEventListener('touchcancel', () => drag.cancel(this))
    }

    window.addEventListener('resize', this.onOrientationChange)
  }

  detach = () => {
    this.dom = undefined
    window.removeEventListener('resize', this.onOrientationChange)
  }

  setBounds = (bounds: ClientRect) => {
    if (this.dom) this.dom.bounds = bounds
  }

  redrawSync = (): void => {
    if (this.dom) renderBoard(this.state, this.dom)
  }

  redraw = (): void => {
    this.state.batchRAF(this.redrawSync)
  }

  getFen = (): string => {
    return fen.write(this.state.pieces)
  }

  getMaterialDiff(): cg.MaterialDiff {
    const diff: cg.MaterialDiff = {
      white: {
        pieces: { king: 0, man: 0 },
        score: 0
      },
      black: {
        pieces: { king: 0, man: 0 },
        score: 0
      }
    };
    const piecesKeys = Object.keys(this.state.pieces)
    for (let i = 0; i < piecesKeys.length; i++) {
      const p = this.state.pieces[piecesKeys[i]]
      if (p.role != "ghostman" && p.role != "ghostking") {
        const them = diff[util.opposite(p.color)]
        if (them.pieces[p.role] > 0) them.pieces[p.role]--;
        else diff[p.color].pieces[p.role]++;
      }
    }
    diff.white.score = this.getScore(this.state.pieces)
    diff.black.score = -diff.white.score
    return diff;
  }

  set(config: cg.SetConfig, noCaptSequences: boolean = false): void {
    anim(state => setNewBoardState(state, config), this, false, noCaptSequences)
    if (this.state.selected && !this.state.pieces[this.state.selected])
      this.state.selected = null;
  }

  reconfigure(config: cg.InitConfig): void {
    anim(state => configureBoard(state, config), this)
  }

  toggleOrientation = (): void => {
    anim(board.toggleOrientation, this)
  }

  setOtbMode(mode: 'flip' | 'facing'): void {
    anim(state => {
      state.otbMode = mode
    }, this)
  }

  setPieces(pieces: cg.PiecesDiff): void {
    anim(state => board.setPieces(state, pieces), this)
  }

  dragNewPiece(e: TouchEvent, piece: Piece, force = false): void {
    drag.dragNewPiece(this, piece, e, force)
  }

  selectSquare(key: Key | null): void {
    if (key) anim(state => board.selectSquare(state, key), this)
    else if (this.state.selected) {
      board.unselect(this.state)
      this.redraw()
    }
  }

  apiMove(orig: Key, dest: Key, pieces?: cg.PiecesDiff, config?: cg.SetConfig, finishCapture?: boolean): void {
    anim(state => {
      board.apiMove(state, orig, dest, finishCapture)

      if (pieces) {
        board.setPieces(state, pieces)
      }

      if (config) {
        setNewBoardState(state, config)
      }

    }, this)
  }

  apiNewPiece(piece: Piece, key: Key, config?: cg.SetConfig): void {
    anim(state => {
      board.apiNewPiece(state, piece, key)
      if (config) {
        setNewBoardState(state, config)
      }
    }, this)
  }

  playPremove = (): boolean => {

    if (this.state.premovable.current) {
      const dest = this.state.premovable.current ? this.state.premovable.current[1] : '00';
      if (Boolean(anim(board.playPremove, this))) {
        // if we can continue capturing keep the piece selected, so all target squares can be clicked one after the other
        if (this.state.movable.captLen !== null && this.state.movable.captLen > 1)
          board.setSelected(this.state, dest);
        return true;
      }
      // if the premove couldn't be played, redraw to clear it up
      this.redraw()
    }
    return false
  }

  playPredrop = (validate: (d: cg.Drop) => boolean): boolean => {

    if (this.state.predroppable.current) {
      const result = board.playPredrop(this.state, validate)
      this.redraw()
      return result
    }
    return false
  }

  cancelPremove = (): void => {
    skipAnim(board.unsetPremove, this)
  }

  cancelPredrop = (): void => {
    skipAnim(board.unsetPredrop, this)
  }

  setCheck = (a: Color | boolean) => {
    skipAnim(state => board.setCheck(state, a), this)
  }

  cancelMove = (): void => {
    drag.cancel(this)
    skipAnim(state => board.cancelMove(state), this)
  }

  stop = () => {
    drag.cancel(this)
    skipAnim(state => board.stop(state), this)
  }

  explode = (keys: Key[]) => {
    if (!this.dom) return
    this.state.exploding = {
      stage: 1,
      keys: keys
    }
    this.redraw()
    setTimeout(() => {
      if (this.state.exploding) {
        this.state.exploding.stage = 2
        this.redraw()
      }
      setTimeout(() => {
        this.state.exploding = null
        this.redraw()
      }, 120)
    }, 120)
  }

  // no need to debounce: resizable only by orientation change
  private onOrientationChange = () => {
    const dom = this.dom
    if (dom) {
      // yolo
      clearTimeout(this.resizeTimeoutId)
      this.resizeTimeoutId = setTimeout(() => {
        dom.bounds = dom.board.getBoundingClientRect()
        this.redraw()
      }, 100)
    }
  }

  private getScore(pieces: cg.Pieces): number {
    let score = 0, k;
    for (k in pieces) {
      score += pieceScores[pieces[k].role] * (pieces[k].color === 'white' ? 1 : -1);
    }
    return score;
  }
}
