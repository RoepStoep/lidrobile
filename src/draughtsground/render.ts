import * as cg from './interfaces'
import { State } from './state'
import { boardFields } from './board'
import * as util from './util'

/**
 * Board diffing and rendering logic. It runs in 3 main steps:
 *   1. Iterate over all DOM elements under board (pieces and squares).
 *     For each element, flag it either as 'same' if current state objet holds the
 *     same element at this DOM position (using board key as position ID) or as
 *     'moved' otherwise. Flagged elements are kept in sets for next steps.
 *     Apply animation and capture changes if necessary.
 *
 *   2. Iterate over all pieces and square objects from State. For each element,
 *   if it was flagged as 'same', do nothing. Otherwise 2 possibilities:
 *     - an equivalent piece or square is found in the corresponding 'moved' set:
 *     reuse it and apply translation change;
 *     - no dom element found in the 'moved' set: create it and append it to the
 *     board element
 *
 *   3. Delete from the DOM all remaining element in the 'moved' sets.
 *
 * These steps ensure that, for each re-rendering, the smallest number of DOM
 * operations are made.
 */
export function renderBoard(d: State, dom: cg.DOM) {
  const boardElement = dom.board
  const asWhite = d.orientation === 'white'
  const bs = d.boardSize
  const posToTranslate = d.fixed ? posToTranslateRel(bs) : posToTranslateAbs(dom.bounds, bs)
  const boardSizeChange = d.prev.boardSize && (d.prev.boardSize[0] !== d.boardSize[0] || d.prev.boardSize[1] !== d.boardSize[1])
  d.prev.boardSize = [d.boardSize[0], d.boardSize[1]]
  const orientationChange = d.prev.orientation && d.prev.orientation !== d.orientation
  d.prev.orientation = d.orientation
  const boundsChange = d.prev.bounds && d.prev.bounds !== dom.bounds
  d.prev.bounds = dom.bounds
  const allChange = boundsChange || orientationChange || boardSizeChange
  const pieces = d.pieces
  const anims = d.animation.current && d.animation.current.plan.anims
  const temporaryPieces = d.animation.current && d.animation.current.plan.captures
  const temporaryRoles = d.animation.current && d.animation.current.plan.tempRole
  const squares: Map<Key, string> = computeSquareClasses(d)
  const samePieces: Set<Key> = new Set()
  const sameSquares: Set<Key> = new Set()
  const movedPieces: Map<string, cg.PieceNode[]> = new Map()
  const movedSquares: Map<string, cg.SquareNode[]> = new Map()
  const piecesKeys = Object.keys(pieces) as Array<Key>
  let squareClassAtKey, pieceAtKey, anim, tempPiece, tempRole, translate
  let mvdset, mvd
  let animDoubleKey = (d.animation.current && d.animation.current.lastMove && d.animation.current.lastMove.length > 2 && d.animation.current.lastMove[0] === d.animation.current.lastMove[d.animation.current.lastMove.length - 1]) ? d.animation.current.lastMove[0] : undefined

  let otbTurnFlipChange, otbModeChange, otbChange = false
  if (d.otb) {
    otbTurnFlipChange = d.prev.turnColor && d.prev.turnColor !== d.turnColor
    otbModeChange = d.prev.otbMode && d.prev.otbMode !== d.otbMode
    d.prev.otbMode = d.otbMode
    d.prev.turnColor = d.turnColor
    otbChange = !!(otbTurnFlipChange || otbModeChange)
  }

  if (orientationChange || boardSizeChange) {
    const coords = (dom.elements.coordRanks || dom.elements.coordFiles)
    if (d.coordinates === 2 && coords) {
      const wrapper = coords.parentElement
      if (wrapper) makeCoords(wrapper, d.boardSize, d.orientation, dom, d.coordSystem)
    } else if (d.coordinates === 1) {
      makeFieldnumbers(d, dom)
    } else {
      clearCoords(dom)
    }
  }

  // walk over all board dom elements, apply animations and flag moved pieces
  let el = dom.board.firstChild as cg.KeyedNode
  while (el) {
    const k = el.cgKey
    pieceAtKey = pieces[k]
    squareClassAtKey = squares.get(k)
    anim = anims && anims[k]
    tempPiece = temporaryPieces && temporaryPieces[k]
    tempRole = temporaryRoles && temporaryRoles[k]
    if (isPieceNode(el)) {
      // if piece not being dragged anymore, remove dragging style
      if (el.cgDragging && (!d.draggable.current || d.draggable.current.orig !== k)) {
        el.classList.remove('dragging')
        el.classList.remove('magnified')
        translate = posToTranslate(util.key2pos(k, bs), asWhite, 0)
        positionPiece(d, el, el.cgColor, translate)
        el.cgDragging = false
      }
      if (el.classList.contains('temporary') && tempPiece) {
        // piece belongs here, check if it still has the right properties
        const fullPieceName = pieceNameOf(tempPiece) + ' temporary'
        if (el.cgPiece !== fullPieceName)
          el.className = fullPieceName
        samePieces.add(k)
      } else if (pieceAtKey) {
        const pieceAtKeyName = pieceNameOf(pieceAtKey)
        // there is now a piece at this dom key
        // continue animation if already animating and same color
        // (otherwise it could animate a captured piece)
        if (anim && el.cgAnimating && el.cgPiece === pieceAtKeyName) {
          animDoubleKey = undefined // only needed to get the animation started
          const pos = util.key2pos(k, bs)
          pos[0] += anim[2]
          pos[1] += anim[3]
          if (d.animation.current && d.animation.current.plan.nextPlan && d.animation.current.plan.nextPlan.anims[k] && !util.isObjectEmpty(d.animation.current.plan.nextPlan.anims[k])) {
            pos[0] += d.animation.current.plan.nextPlan.anims[k][2]
            pos[1] += d.animation.current.plan.nextPlan.anims[k][3]
          }
          el.classList.add('anim')
          if (tempRole) {
            el.className = el.className.replace(pieceAtKey.role, tempRole)
            el.classList.add('temprole')
          } else if (el.classList.contains('temprole')) {
            el.classList.remove('temprole')
            if (pieceAtKey.role === 'king')
              el.className = el.className.replace('man', 'king')
            else if (pieceAtKey.role === 'man')
              el.className = el.className.replace('king', 'man')
          }
          translate = posToTranslate(pos, asWhite, anim[4])
          positionPiece(d, el, el.cgColor, translate)
        } else if (el.cgAnimating) {
          el.cgAnimating = false
          el.classList.remove('anim')
          if (el.classList.contains('temprole')) {
            el.classList.remove('temprole')
            if (pieceAtKey.role === 'king')
              el.className = el.className.replace('man', 'king')
            else if (pieceAtKey.role === 'man')
              el.className = el.className.replace('king', 'man')
          }
          translate = posToTranslate(util.key2pos(k, bs), asWhite, 0)
          positionPiece(d, el, el.cgColor, translate)
        }
        // same piece: flag as same. Exception for capture ending on the start square, as no pieces are added or removed
        if (el.cgPiece === pieceAtKeyName && !allChange && !otbChange && k !== animDoubleKey) {
          samePieces.add(k)
        }
        // different piece: flag as moved unless it is a captured piece
        else {
            movedPieces.set(el.cgPiece, (movedPieces.get(el.cgPiece) || []).concat(el))
        }
      }
      // no piece: flag as moved
      else {
        movedPieces.set(el.cgPiece, (movedPieces.get(el.cgPiece) || []).concat(el))
      }
    }
    else if (isSquareNode(el)) {
      if (!allChange && squareClassAtKey === el.className) {
        sameSquares.add(k)
      }
      else {
        movedSquares.set(
          el.className,
          (movedSquares.get(el.className) || []).concat(el)
        )
      }
    }
    el = el.nextSibling as cg.KeyedNode
  }

  // walk over all squares in current state object, apply dom changes to moved
  // squares or append new squares
  squares.forEach((squareClass: string, k: Key) => {
    if (!sameSquares.has(k)) {
      mvdset = movedSquares.get(squareClass)
      mvd = mvdset && mvdset.pop()
      if (mvd) {
        mvd.cgKey = k
        translate = posToTranslate(util.key2pos(k, bs), asWhite, 0)
        positionSquare(d, mvd, translate)
      }
      else {
        const se = document.createElement('square') as cg.SquareNode
        se.className = squareClass
        se.cgKey = k
        translate = posToTranslate(util.key2pos(k, bs), asWhite, 0)
        positionSquare(d, se, translate)
        boardElement.insertBefore(se, boardElement.firstChild)
      }
    }
  })

  // walk over all pieces in current state object, apply dom changes to moved
  // pieces or append new pieces
  for (let j = 0, jlen = piecesKeys.length; j < jlen; j++) {
    const k = piecesKeys[j]
    const p = pieces[k]
    anim = anims && anims[k]
    tempPiece = temporaryPieces && temporaryPieces[k]
    tempRole = temporaryRoles && temporaryRoles[k]
    if (!samePieces.has(k) && !tempPiece) {
      mvdset = movedPieces.get(pieceNameOf(p))
      mvd = mvdset && mvdset.pop()
      // a equivalent piece was moved
      if (mvd) {
        // apply dom changes
        mvd.cgKey = k
        const pos = util.key2pos(k, bs)
        let shift: number
        if (anim) {
          mvd.cgAnimating = true
          mvd.classList.add('anim')
          pos[0] += anim[2]
          pos[1] += anim[3]
          shift = anim[4]
          if (d.animation.current && d.animation.current.plan.nextPlan && d.animation.current.plan.nextPlan.anims[k] && !util.isObjectEmpty(d.animation.current.plan.nextPlan.anims[k])) {
            pos[0] += d.animation.current.plan.nextPlan.anims[k][2]
            pos[1] += d.animation.current.plan.nextPlan.anims[k][3]
          }
        } else shift = 0
        translate = posToTranslate(pos, asWhite, shift)
        positionPiece(d, mvd, mvd.cgColor, translate)
      }
      // no piece in moved set: insert the new piece
      else {
        const pe = document.createElement('piece') as cg.PieceNode
        const pName = pieceNameOf(p)
        const pos = util.key2pos(k, bs)
        pe.className = pName
        pe.cgPiece = pName
        pe.cgColor = p.color
        pe.cgKey = k
        let shift: number
        if (anim) {
          pe.cgAnimating = true
          pos[0] += anim[2]
          pos[1] += anim[3]
          shift = anim[4]
          if (tempRole) {
            pe.className = pe.className.replace(p.role, tempRole)
            pe.classList.add('temprole')
          }
        } else shift = 0
        translate = posToTranslate(pos, asWhite, shift)
        positionPiece(d, pe, p.color, translate)
        boardElement.appendChild(pe)
      }
    }
  }

  for (const i in temporaryPieces) {
    tempPiece = temporaryPieces[i]
    const k = i as Key
    if (tempPiece && !samePieces.has(k)) {
      const pe = document.createElement('piece') as cg.PieceNode
      const pName = pieceNameOf(tempPiece) + ' temporary'
      const pos = util.key2pos(k, bs)
      pe.className = pName
      pe.cgPiece = pName
      pe.cgKey = k
      translate = posToTranslate(pos, asWhite, 0)
      positionPiece(d, pe, tempPiece.color, translate)
      boardElement.appendChild(pe)
    }
  }

  // remove from the board any DOM element that remains in the moved sets
  const rmEl = (e: HTMLElement) => boardElement.removeChild(e)
  movedPieces.forEach(els => els.forEach(rmEl))
  movedSquares.forEach(els => els.forEach(rmEl))
}

function posToTranslateBase(pos: cg.Pos, boardSize: cg.BoardSize, asWhite: boolean, xFactor: number, yFactor: number, shift: number): NumberPair {
  const xf = boardSize[0] / 2 - 0.5
  if (shift !== 0) {
    return [
      (!asWhite ? xf - ((shift - 0.5) + pos[0]) : (shift - 0.5) + pos[0]) * xFactor,
      (!asWhite ? boardSize[1] - pos[1] : pos[1] - 1.0) * yFactor
    ]
  } else {
    return [
      (!asWhite ? xf - ((pos[1] % 2 !== 0 ? -0.5 : -1.0) + pos[0]) : (pos[1] % 2 !== 0 ? -0.5 : -1.0) + pos[0]) * xFactor,
      (!asWhite ? boardSize[1] - pos[1] : pos[1] - 1.0) * yFactor
    ]
  }
}

const posToTranslateAbs = (bounds: ClientRect, boardSize: cg.BoardSize) => {
  const xFactor = bounds.width / (boardSize[0] / 2), yFactor = bounds.height / boardSize[1]
  return (pos: cg.Pos, asWhite: boolean, shift: number) => posToTranslateBase(pos, boardSize, asWhite, xFactor, yFactor, shift)
}

export const posToTranslateRel = (boardSize: cg.BoardSize) => {
  return (pos: cg.Pos, asWhite: boolean, shift: number) => posToTranslateBase(pos, boardSize, asWhite, 2 * 100 / boardSize[0], 100 / boardSize[1], shift)
}

function positionPiece(d: State, el: HTMLElement, color: Color, pos: NumberPair) {
  if (d.fixed) {
    el.style.left = pos[0] + '%'
    el.style.top = pos[1] + '%'
  }
  else {
    el.style.transform = util.transform(d, color, util.translate(pos))
  }
}

function positionSquare(d: State, el: HTMLElement, pos: NumberPair) {
  if (d.fixed) {
    el.style.left = pos[0] + '%'
    el.style.top = pos[1] + '%'
  } else {
    el.style.transform = util.translate(pos)
  }
}

function isPieceNode(el: cg.PieceNode | cg.SquareNode): el is cg.PieceNode {
  return el.tagName === 'PIECE'
}
function isSquareNode(el: cg.PieceNode | cg.SquareNode): el is cg.SquareNode {
  return el.tagName === 'SQUARE'
}

function pieceNameOf(p: Piece) {
  if (p.role === 'ghostman') {
    return `${p.color} man ghost`
  } else if (p.role === 'ghostking') {
    if (p.kingMoves && p.kingMoves > 0)
      return `${p.color} king ghost king${p.kingMoves}`
    else
      return `${p.color} king ghost`
  } else if (p.role === 'king' && p.kingMoves && p.kingMoves > 0) {
    return `${p.color} king king${p.kingMoves}`
  } else {
    return `${p.color} ${p.role}`
  }
}

function addSquare(squares: Map<Key, string>, key: Key, klass: string) {
  squares.set(key, (squares.get(key) || '') + ' ' + klass)
}

function computeSquareClasses(d: State): Map<Key, string> {
  const squares = new Map()
  if (d.lastMove && d.highlight.lastMove) d.lastMove.forEach((k) => {
    if (k) addSquare(squares, k, 'last-move')
  })

  if (d.selected) {
    addSquare(squares, d.selected, 'selected')
    const dests = d.movable.dests && d.movable.dests[d.selected]
    if (dests) dests.forEach((k) => {
      if (d.movable.showDests) addSquare(squares, k, 'move-dest' + (d.pieces[k] ? ' occupied' : ''))
    })
    const pDests = d.premovable.dests
    if (pDests) pDests.forEach((k) => {
      if (d.movable.showDests) addSquare(squares, k, 'premove-dest' + (d.pieces[k] ? ' occupied' : ''))
    })
  }
  const premove = d.premovable.current
  if (premove) premove.forEach((k) => {
    addSquare(squares, k, 'current-premove')
  })

  if (d.exploding) d.exploding.keys.forEach((k) => {
    addSquare(squares, k, 'exploding' + d.exploding!.stage)
  })
  return squares
}

export function makeCoords(el: HTMLElement, boardSize: cg.BoardSize, orientation: Color, dom?: cg.DOM, coordSystem?: number) {
  let coordRanks, coordFiles
  if (coordSystem === 1) {
    coordRanks = renderCoords(util.ranksRev, 'ranks is64' + (orientation === 'black' ? ' black' : ''), (i) => i % 2 === 1 ? 'coord-odd' : 'coord-even')
    coordFiles = renderCoords(util.files, 'files is64' + (orientation === 'black' ? ' black' : ''), (i) => i % 2 === 0 ? 'coord-odd' : 'coord-even')
  } else if (orientation === 'black') {
    const filesBlack: number[] = [], ranksBlack: number[] = [],
      rankBase = boardSize[0] / 2,
      fileSteps = boardSize[1] / 2
    for (let i = 1; i <= rankBase; i++) filesBlack.push(i)
    for (let i = 0; i < fileSteps; i++) ranksBlack.push(rankBase + boardSize[0] * i + 1)
    coordRanks = renderCoords(ranksBlack, 'ranks is100 black', () => 'coord-odd')
    coordFiles = renderCoords(filesBlack, 'files is100 black', () => 'coord-even')
  } else {
    const files: number[] = [], ranks: number[] = [],
      rankBase = boardSize[0] / 2,
      fields = boardSize[0] * boardSize[1] / 2,
      fileSteps = boardSize[1] / 2
    for (let i = fields - rankBase + 1; i <= fields; i++) files.push(i)
    for (let i = 0; i < fileSteps; i++) ranks.push(rankBase + boardSize[0] * i)
    coordRanks = renderCoords(ranks, 'ranks is100', () => 'coord-even')
    coordFiles = renderCoords(files, 'files is100', () => 'coord-odd')
  }
  if (dom) {
    if (dom.elements.coordRanks) el.removeChild(dom.elements.coordRanks)
    if (dom.elements.coordFiles) el.removeChild(dom.elements.coordFiles)
    clearCoords(dom)
    dom.elements.coordRanks = coordRanks
    dom.elements.coordFiles = coordFiles
  }
  el.appendChild(coordRanks)
  el.appendChild(coordFiles)
}

export function makeFieldnumbers(s: State, dom?: cg.DOM) {
  if (!dom) return
  clearCoords(dom)
  const asWhite = s.orientation !== 'black',
    count = boardFields(s)
  for (let f = 1; f <= count; f++) {
    const field = document.createElement('fieldnumber'),
      san = f.toString()
    field.className = 'coord-odd'
    field.textContent = s.coordSystem === 1 ? util.san2alg[san] : san
    const coords = posToTranslateAbs(dom.bounds, s.boardSize)(util.key2pos(util.allKeys[f - 1], s.boardSize), asWhite, 0)
    field.style.transform = util.translate(coords)
    dom.board.appendChild(field)
  }
}

function clearCoords(dom: cg.DOM) {
  if (dom.elements.coordRanks) delete dom.elements.coordRanks
  if (dom.elements.coordFiles) delete dom.elements.coordFiles
  const oldFields = dom.board.children
  if (oldFields && oldFields.length) {
    for (let i = oldFields.length - 1; i >= 0; i--) {
      const field = oldFields[i]
      if (field.tagName === 'FIELDNUMBER') {
        dom.board.removeChild(field)
      }
    }
  }
}

function renderCoords(elems: ReadonlyArray<number | string>, klass: string, coordClass: (i: number) => string) {
  const el = document.createElement('li-coords')
  el.className = klass
  elems.forEach((content: number | string, index: number) => {
    const f = document.createElement('li-coord')
    f.className = coordClass(index)
    f.textContent = String(content)
    el.appendChild(f)
  })
  return el
}
