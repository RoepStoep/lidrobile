import * as cg from './interfaces'
import { State, makeDefaults } from './state'
import * as board from './board'
import fen from './fen'

export function initBoard(cfg: cg.InitConfig): State {
  const defaults = makeDefaults()

  configureBoard(defaults, cfg || {})

  return defaults
}

export function configureBoard(state: State, config: cg.InitConfig): void {

  if (!config) return

  // don't merge destinations. Just override.
  if (config.movable && config.movable.dests) state.movable.dests = null
  if (config.movable && config.movable.captureUci) state.movable.captureUci = null

  merge(state, config)

  // if a fen was provided, replace the pieces
  if (config.fen) {
    state.pieces = fen.read(config.fen)

    // show kingmoves for frisian variants
    if (state.highlight && state.highlight.kingMoves) {
      const kingMoves = fen.readKingMoves(config.fen);
      if (kingMoves) doSetKingMoves(state, kingMoves);
    }
  }

  if (config.captureLength !== undefined)
    state.movable.captLen = config.captureLength;

  if (config.hasOwnProperty('lastMove') && !config.lastMove) {
    state.lastMove = null
    state.animateFrom = null
  }

  // fix move/premove dests
  if (state.selected) board.setSelected(state, state.selected)

  // no need for such short animations
  if (!state.animation.duration || state.animation.duration < 10)
    state.animation.enabled = false
}

export function setNewBoardState(d: State, config: cg.SetConfig): void {
  if (!config) return

  if (config.fen) {
    d.pieces = fen.read(config.fen)
  }

  // kingmoves for frisian variants
  if (d.highlight && d.highlight.kingMoves) {
    const kingMoves = config.kingMoves ? config.kingMoves : (config.fen? fen.readKingMoves(config.fen) : null);
    if (kingMoves !== null) setKingMoves(d, kingMoves);
  }

  if (config.orientation !== undefined) d.orientation = config.orientation
  if (config.turnColor !== undefined) d.turnColor = config.turnColor

  if (config.dests !== undefined) {
    d.movable.dests = config.dests
  }

  if (config.movableColor !== undefined) {
    d.movable.color = config.movableColor
  }

  if (config.captureLength !== undefined) {
    d.movable.captLen = config.captureLength
  }

  if (config.captureUci !== undefined) {
    d.movable.captureUci = config.captureUci
  }

  if (config.hasOwnProperty('lastMove') && !config.lastMove) {
    d.lastMove = null
    d.animateFrom = null
  } else if (config.lastMove) {
    d.lastMove = config.lastMove
    d.animateFrom = null
  }

  // fix move/premove dests
  if (d.selected) {
    board.setSelected(d, d.selected)
  }
}

export function setKingMoves(state: State, kingMoves: cg.KingMoves) {
  for (let f = 1; f <= 50; f++) {
    const key = (f < 10 ? '0' + f.toString() : f.toString()) as Key,
      piece = state.pieces[key];
    if (piece && piece.kingMoves)
      piece.kingMoves = undefined;
  }
  doSetKingMoves(state, kingMoves);
}

function doSetKingMoves(state: State, kingMoves: cg.KingMoves) {
  if (kingMoves.white.count > 0 && kingMoves.white.key) {
    const piece = state.pieces[kingMoves.white.key];
    if (piece && piece.role === 'king' && piece.color === 'white')
      piece.kingMoves = kingMoves.white.count;
  }

  if (kingMoves.black.count > 0 && kingMoves.black.key) {
    const piece = state.pieces[kingMoves.black.key];
    if (piece && piece.role === 'king' && piece.color === 'black')
      piece.kingMoves = kingMoves.black.count;
  }
}

function merge(base: any, extend: any) {
  for (let key in extend) {
    if (isObject(base[key]) && isObject(extend[key])) merge(base[key], extend[key])
    else base[key] = extend[key]
  }
}

function isObject(o: any): boolean {
  return o && typeof o === 'object'
}
