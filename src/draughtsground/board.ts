import { State } from './state'
import * as cg from './interfaces'
import * as util from './util'
import premove from './premove'

export function toggleOrientation(state: State): void {
  state.orientation = util.opposite(state.orientation)
}

export function reset(state: State): void {
  state.lastMove = null
  setSelected(state, null)
  unsetPremove(state)
  unsetPredrop(state)
}

export function setPieces(state: State, pieces: cg.PiecesDiff): void {
  for (let key in pieces) {
    const piece = pieces[key]
    if (piece) state.pieces[key] = piece
    else delete state.pieces[key]
  }
}

export function setCheck(state: State, color: Color | boolean): void {
  if (color === true) color = state.turnColor
  if (!color) state.check = null
  else for (let k in state.pieces) {
    if (state.pieces[k].role === 'king' && state.pieces[k].color === color) {
      state.check = k as Key
    }
  }
}

export function setPremove(state: State, orig: Key, dest: Key): void {
  unsetPredrop(state)
  state.premovable.current = [orig, dest]
  setTimeout(() => {
    if (state.premovable.events.set) state.premovable.events.set(orig, dest)
  }, 0)
}

export function unsetPremove(state: State): void {
  if (state.premovable.current) {
    state.premovable.current = null
    setTimeout(state.premovable.events.unset || util.noop)
  }
}

export function setPredrop(state: State, role: Role, key: Key): void {
  unsetPremove(state)
  state.predroppable.current = {
    role: role,
    key
  } as cg.Drop
  setTimeout(() => {
    if (state.predroppable.events.set) state.predroppable.events.set(role, key)
  }, 0)
}

export function unsetPredrop(state: State): void {
  if (state.predroppable.current) {
    state.predroppable.current = null
    setTimeout(() => {
      if (state.predroppable.events.unset) state.predroppable.events.unset()
    })
  }
}

export function calcCaptKey(pieces: cg.Pieces, startX: number, startY: number, destX: number, destY: number): Key | null {

  const xDiff: number = destX - startX, yDiff: number = destY - startY;

  //Frisian captures always satisfy condition: (x = 0, y >= +-2) or (x = +-1, y = 0)
  //In normal captures these combination is impossible: x = 0 means y = 1, while y = 0 is impossible
  const yStep: number = yDiff === 0 ? 0 : (yDiff > 0 ? ((xDiff === 0 && Math.abs(yDiff) >= 2) ? 2 : 1) : ((xDiff === 0 && Math.abs(yDiff) >= 2) ? -2 : -1));
  const xStep: number = xDiff === 0 ? 0 : (yDiff === 0 ? (xDiff > 0 ? 1 : -1) : (startY % 2 == 0 ? (xDiff < 0 ? -1 : 0) : (xDiff > 0 ? 1 : 0)));

  if (xStep === 0 && yStep === 0) return null;

  const captPos = [startX + xStep, startY + yStep] as cg.Pos;
  if (captPos === undefined) return null;

  const captKey: Key = util.pos2key(captPos);

  const piece: Piece | undefined = pieces[captKey];
  if (piece !== undefined && piece.role !== 'ghostman' && piece.role !== 'ghostking')
    return captKey
  else
    return calcCaptKey(pieces, startX + xStep, startY + yStep, destX, destY)

}

export function apiMove(state: State, orig: Key, dest: Key): Piece | boolean {
  return baseMove(state, orig, dest)
}

export function apiNewPiece(state: State, piece: Piece, key: Key): boolean {
  return baseNewPiece(state, piece, key)
}

export function userMove(state: State, orig: Key, dest: Key): boolean {
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest)
    if (result) {
      setSelected(state, null)
      setTimeout(() => {
        if (state.movable.events.after) state.movable.events.after(orig, dest, {
          premove: false
        })
      })
      return true
    }
  }
  else if (canPremove(state, orig, dest)) {
    setPremove(state, orig, dest)
    setSelected(state, null)
  }
  else if (isMovable(state, dest) || isPremovable(state, dest)) {
    setSelected(state, dest)
  } else {
    unselect(state)
  }

  return false
}

export function dropNewPiece(state: State, orig: Key, dest: Key, force = false): void {
  if (canDrop(state, orig, dest) || force) {
    const piece = state.pieces[orig]
    delete state.pieces[orig]
    baseNewPiece(state, piece, dest, force)
    setTimeout(() => {
      if (state.movable.events.afterNewPiece) state.movable.events.afterNewPiece(piece.role, dest, {
        premove: false,
        predrop: false
      })
    })
  } else if (canPredrop(state, orig, dest)) {
    setPredrop(state, state.pieces[orig].role, dest)
  } else {
    unsetPremove(state)
    unsetPredrop(state)
  }
  delete state.pieces[orig]
  setSelected(state, null)
}

export function selectSquare(state: State, key: Key, force?: boolean): void {
  if (state.selected) {
    if (state.selected === key && !state.draggable.enabled) {
      unselect(state)
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (userMove(state, state.selected, key)) {
        // if we can continue capturing keep the piece selected, so all target squares can be clicked one after the other
        if (state.movable.captLen !== null && state.movable.captLen > 1)
          setSelected(state, key);
      }
    }
  } else if (isMovable(state, key) || isPremovable(state, key)) {
    setSelected(state, key)
  }
}

export function setSelected(state: State, key: Key | null): void {
  state.selected = key
  if (key && isPremovable(state, key))
    state.premovable.dests = premove(state.pieces, key, state.premovable.variant)
  else
    state.premovable.dests = null
}

export function unselect(state: State): void {
  state.selected = null
  state.premovable.dests = null
}

export function isMovable(state: State, orig: Key): boolean {
  const piece = state.pieces[orig]
  return piece && (
    state.movable.color === 'both' || (
      state.movable.color === piece.color &&
      state.turnColor === piece.color
    ))
}

export function canMove(state: State, orig: Key, dest: Key): boolean {
  return orig !== dest && isMovable(state, orig) && (
    state.movable.free || (state.movable.dests !== null && util.containsX(state.movable.dests[orig], dest))
  )
}

export function canDrop(state: State, orig: Key, dest: Key): boolean {
  const piece = state.pieces[orig]
  return piece && dest && (orig === dest || !state.pieces[dest]) && (
    state.movable.color === 'both' || (
      state.movable.color === piece.color &&
      state.turnColor === piece.color
    ))
}

export function isPremovable(state: State, orig: Key): boolean {
  const piece = state.pieces[orig]
  return piece && state.premovable.enabled &&
    state.movable.color === piece.color &&
    state.turnColor !== piece.color
}

export function canPremove(state: State, orig: Key, dest: Key): boolean {
  return orig !== dest &&
    isPremovable(state, orig) &&
    util.containsX(premove(state.pieces, orig, state.premovable.variant), dest)
}

export function canPredrop(state: State, orig: Key, dest: Key): boolean {
  const piece = state.pieces[orig]
  return piece && dest &&
    (!state.pieces[dest] || state.pieces[dest].color !== state.movable.color) &&
    state.predroppable.enabled &&
    state.movable.color === piece.color &&
    state.turnColor !== piece.color
}

export function isDraggable(state: State, orig: Key): boolean {
  const piece = state.pieces[orig]
  return piece && state.draggable.enabled && (
    state.movable.color === 'both' || (
      state.movable.color === piece.color && (
        state.turnColor === piece.color || state.premovable.enabled
      )
    )
  )
}

export function playPremove(state: State): boolean {
  const move = state.premovable.current
  if (!move) return false
  let success = false;
  const orig = move[0], dest = move[1]
  if (canMove(state, orig, dest)) {
    const moveResult = baseUserMove(state, orig, dest)
    if (moveResult) {
      const metadata: cg.MoveMetadata = { premove: true };
      if (typeof moveResult !== 'boolean') 
        metadata.captured = moveResult;
      setTimeout(() => {
        if (state.movable.events.after) 
          state.movable.events.after(orig, dest, metadata)
      })
      success = true;
    }
  }
  unsetPremove(state)
  return success
}

export function playPredrop(state: State, validate: (d: cg.Drop) => boolean): boolean {
  const drop = state.predroppable.current
  if (!drop) return false
  let success = false
  if (validate(drop)) {
    const piece = {
      role: drop.role,
      color: state.movable.color
    } as Piece
    if (baseNewPiece(state, piece, drop.key)) {
      setTimeout(() => {
        if (state.movable.events.afterNewPiece) state.movable.events.afterNewPiece(drop.role, drop.key, {
          premove: false,
          predrop: true
        })
      })
      success = true
    }
  }
  unsetPredrop(state)
  return success
}

export function cancelMove(state: State): void {
  unsetPremove(state)
  unsetPredrop(state)
  setSelected(state, null)
}

export function stop(state: State): void {
  state.movable.color = null
  state.movable.dests = {}
  cancelMove(state)
}

function baseMove(state: State, orig: Key, dest: Key): Piece | boolean {

  if (orig === dest || !state.pieces[orig]) return false

  const origPos: cg.Pos = util.key2pos(orig), destPos: cg.Pos = util.key2pos(dest);
  const isCapture = (state.movable.captLen && state.movable.captLen > 0);
  const captKey: Key | null = isCapture ? calcCaptKey(state.pieces, origPos[0], origPos[1], destPos[0], destPos[1]) : null;
  const captPiece: Piece | undefined = (isCapture && captKey) ? state.pieces[captKey] : undefined;
  const origPiece = state.pieces[orig];

  // always call events.move
  setTimeout(() => {
    if (state.events.move) state.events.move(orig, dest, captPiece)
  }, 0)

  if (!state.movable.free && 
    (state.movable.captLen === null || state.movable.captLen <= 1) && 
    origPiece.role === 'man' && (
      (origPiece.color === 'white' && destPos[1] === 1) || 
      (origPiece.color === 'black' && destPos[1] === 10)
    )) {
    state.pieces[dest] = {
      role: 'king',
      color: origPiece.color
    };
  } else {
    state.pieces[dest] = state.pieces[orig];
  }
  delete state.pieces[orig]

  if (isCapture && captKey) {

    const captColor = state.pieces[captKey].color;
    const captRole = state.pieces[captKey].role;
    delete state.pieces[captKey]

    //Show a ghostpiece when we capture more than once
    if (state.movable.captLen !== null && state.movable.captLen > 1) {
      if (captRole === 'man') {
        state.pieces[captKey] = {
          role: 'ghostman',
          color: captColor
        };
      } else if (captRole === 'king') {
        state.pieces[captKey] = {
          role: 'ghostking',
          color: captColor
        };
      }
    } else {
      //Remove any remaing ghost pieces if capture sequence is done
      for (let i = 0; i < util.allKeys.length; i++) {
        const pc = state.pieces[util.allKeys[i]];
        if (pc !== undefined && (pc.role === 'ghostking' || pc.role === 'ghostman'))
          delete state.pieces[ util.allKeys[i]];
      }
    }
  }

  if (state.lastMove !== null && state.lastMove.length > 0 && isCapture) {
    if (state.lastMove[state.lastMove.length - 1] === orig)
      state.lastMove.push(dest);
    else
      state.lastMove = [orig, dest];
  } else {
    state.lastMove = [orig, dest];
  }

  setTimeout(state.events.change || util.noop)
  return captPiece || true
}

function baseNewPiece(state: State, piece: Piece, key: Key, force = false): boolean {
  if (state.pieces[key]) {
    if (force) delete state.pieces[key]
    else return false
  }
  setTimeout(() => {
    if (state.events.dropNewPiece) state.events.dropNewPiece(piece, key)
  })
  state.pieces[key] = piece
  state.lastMove = [key, key]
  setTimeout(state.events.change || util.noop)
  state.movable.dests = {}
  state.turnColor = util.opposite(state.turnColor)
  return true
}

function baseUserMove(state: State, orig: Key, dest: Key): Piece | boolean {
  const result = baseMove(state, orig, dest)
  if (result) {
    state.movable.dests = null
    if (state.movable.captLen === null || state.movable.captLen <= 1)
      state.turnColor = util.opposite(state.turnColor);
    state.animation.current = null
  }
  return result
}
