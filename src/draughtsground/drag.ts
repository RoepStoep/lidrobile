import { batchRequestAnimationFrame } from '../utils/batchRAF'
import * as cg from './interfaces'
import { State } from './state'
import Draughtsground from './Draughtsground'
import * as board from './board'
import * as util from './util'
import { anim } from './anim'

export interface DragCurrent {
  orig: Key // orig key of dragging piece
  origPos: cg.Pos
  piece: Piece
  rel: NumberPair // x; y of the piece at original position
  epos: NumberPair // initial event position
  pos: NumberPair // relative current position
  dec: NumberPair // piece center decay
  over: Key | null // square being moused over
  prevOver: Key | null// square previously moused over
  started: boolean // whether the drag has started; as per the distance setting
  element: cg.PieceNode | null
  showGhost: boolean // whether to show ghost when dragging
  originTarget: EventTarget | null,
  previouslySelected: Key | null
  newPiece?: boolean // it it a new piece from outside the board
  force?: boolean // can the new piece replace an existing one (editor)
  scheduledAnimationFrame?: boolean
}

export function dragNewPiece(ctrl: Draughtsground, piece: Piece, e: TouchEvent, force?: boolean): void {

  const key: Key = '00'
  const s = ctrl.state
  const bs = s.boardSize
  const dom = ctrl.dom
  if (!dom) return

  s.pieces[key] = piece

  // we need the new piece to be in DOM immediately
  ctrl.redrawSync()

  const position = util.eventPosition(e) as NumberPair
  const asWhite = s.orientation === 'white'
  const bounds = dom.bounds
  const squareBounds = util.computeSquareBounds(s.orientation, bounds, key, bs)

  const rel: NumberPair = [
    (asWhite ? -1 : bs[0]) * squareBounds.width + bounds.left,
    (!asWhite ? (bs[1] - 1) : 0) * squareBounds.height + bounds.top
  ]

  s.draggable.current = {
    orig: key,
    origPos: util.key2pos(key, bs),
    piece,
    rel,
    epos: position,
    pos: [position[0] - rel[0], position[1] - rel[1]],
    dec: s.draggable.magnified ?
      [-squareBounds.width, -squareBounds.height * 2] :
      [-squareBounds.width / 2, -squareBounds.height / 2],
    over: null,
    prevOver: null,
    started: true,
    element: util.getPieceByKey(dom, key),
    originTarget: e.target,
    previouslySelected: null,
    newPiece: true,
    force: force || false,
    showGhost: false
  }
  processDrag(ctrl)
}

export function start(ctrl: Draughtsground, e: TouchEvent) {
  // support one finger touch only
  if (e.touches && e.touches.length > 1) return
  e.preventDefault()
  const state = ctrl.state
  const dom = ctrl.dom
  if (!dom) return
  const bounds = dom.bounds
  const position = util.eventPosition(e)
  const orig = getKeyAtDomPos(state, position, bounds)
  if (!orig) return
  const previouslySelected = state.selected
  const hadPremove = !!state.premovable.current
  const hadPredrop = !!state.predroppable.current
  if (state.selected && board.canMove(state, state.selected, orig)) {
    anim(s => board.selectSquare(s, orig), ctrl)
  } else {
    board.selectSquare(state, orig)
  }
  const stillSelected = state.selected === orig
  if (state.pieces[orig] && stillSelected && board.isDraggable(state, orig)) {
    const squareBounds = util.computeSquareBounds(state.orientation, bounds, orig, state.boardSize)
    const origPos = util.key2pos(orig, state.boardSize)
    state.draggable.current = {
      previouslySelected,
      orig,
      piece: state.pieces[orig],
      rel: position,
      epos: position,
      pos: [0, 0],
      origPos,
      dec: state.draggable.magnified ? [
        position[0] - (squareBounds.left + squareBounds.width),
        position[1] - (squareBounds.top + squareBounds.height * 2)
      ] : [
        position[0] - (squareBounds.left + squareBounds.width / 2),
        position[1] - (squareBounds.top + squareBounds.height / 2)
      ],
      // auto start drag if we're in drag'n drop only mode
      started: state.selectable.enabled === false,
      over: orig,
      prevOver: null,
      element: util.getPieceByKey(dom, orig),
      originTarget: e.target,
      showGhost: state.draggable.showGhost,
      scheduledAnimationFrame: false
    }
    if (state.draggable.magnified && state.draggable.centerPiece) {
      state.draggable.current.dec[1] = position[1] - (squareBounds.top + squareBounds.height)
    }
    if (state.draggable.current.started) {
      processDrag(ctrl)
    }
  } else {
    if (hadPremove) board.unsetPremove(state)
    if (hadPredrop) board.unsetPredrop(state)
  }
  ctrl.redraw()
}

export function move(ctrl: Draughtsground, e: TouchEvent) {
  if (e.touches && e.touches.length > 1) return
  const state = ctrl.state

  if (state.draggable.preventDefault) e.preventDefault()

  const cur = state.draggable.current
  if (!cur) return

  if (cur.orig) {
    cur.epos = util.eventPosition(e)
    if (!cur.started && util.distance(cur.epos, cur.rel) >= state.draggable.distance) {
      cur.started = true
      processDrag(ctrl)
    }
  }
}

export function end(ctrl: Draughtsground, e: TouchEvent) {
  const state = ctrl.state
  const draggable = state.draggable
  const cur = draggable.current

  if (!cur) return

  // we don't want that end event since the target is different from the drag
  // touchstart
  if (cur.originTarget !== e.target && !cur.newPiece) {
    return
  }
  if (state.draggable.preventDefault) {
    e.preventDefault()
  }
  const dest = cur.over
  board.unsetPremove(state)
  board.unsetPredrop(state)
  // regular drag'n drop move (or crazy drop)
  if (cur.started && dest) {
    if (cur.newPiece) {
      board.dropNewPiece(state, cur.orig, dest, cur.force)
    }
    else {
      board.userMove(state, cur.orig, dest)
      // if we can continue capturing keep the piece selected, so all target squares can be clicked one after the other
      const skipLastMove = state.animateFrom ? state.animateFrom + 1 : 1
      if (state.movable.captLen && state.movable.captLen > (state.lastMove ? state.lastMove.length - skipLastMove : 1))
        board.setSelected(state, dest)
    }
  }
  // board editor mode: delete any piece dropped off the board
  else if (cur.started && draggable.deleteOnDropOff) {
    delete state.pieces[cur.orig]
    setTimeout(state.events.change || util.noop, 0)
  }
  // crazy invalid drop (no dest): delete the piece
  else if (cur.newPiece) {
    delete state.pieces[cur.orig]
  }

  if (cur && cur.orig === cur.previouslySelected && (cur.orig === dest || !dest)) {
    board.unselect(state)
  } else if (!state.selectable.enabled) {
    board.unselect(state)
  }

  state.draggable.current = null

  // must perform it in same raf callback or browser may skip it
  batchRequestAnimationFrame(() => removeDragElements(ctrl.dom))
  ctrl.redraw()
}

export function cancel(ctrl: Draughtsground) {
  const state = ctrl.state
  if (ctrl.dom) removeDragElements(ctrl.dom)
  if (state.draggable.current) {
    state.draggable.current = null
    board.unselect(state)
  }
}

export function getKeyAtDomPos(state: State, pos: NumberPair, bounds: DOMRect): Key | null {

  if (typeof bounds !== 'object') {
    throw new Error('function getKeyAtDomPos require bounds object arg')
  }
  const asWhite = state.orientation === 'white',
    bs = state.boardSize

  let row = Math.ceil(bs[1] * ((pos[1] - bounds.top) / bounds.height))
  if (!asWhite) row = (bs[1] + 1) - row
  let col = Math.ceil(bs[0] * ((pos[0] - bounds.left) / bounds.width))
  if (!asWhite) col = (bs[0] + 1) - col

  if (row % 2 !== 0) {
    if (col % 2 !== 0)
      return null
    else
      col = col / 2
  } else {
    if (col % 2 === 0)
      return null
    else
      col = (col + 1) / 2
  }

  return (col > 0 && col <= bs[0] / 2 && row > 0 && row <= bs[1]) ? util.pos2key([col, row], bs) : null
}

function processDrag(ctrl: Draughtsground) {
  const state = ctrl.state, bs = state.boardSize
  const dom = ctrl.dom
  const cur = state.draggable.current
  if (!cur || !dom) return
  if (cur.scheduledAnimationFrame) return
  cur.scheduledAnimationFrame = true
  requestAnimationFrame(() => {
    const bounds = dom.bounds
    const asWhite = state.orientation === 'white'
    cur.scheduledAnimationFrame = false
    if (cur.orig) {
      // if moving piece is gone, cancel
      if (state.pieces[cur.orig] !== cur.piece) {
        cancel(ctrl)
        return
      }

      // cancel animations while dragging
      if (state.animation.current && state.animation.current.plan.anims[cur.orig]) {
        state.animation.current = null
      }

      const pieceEl = cur.element

      if (cur.started && pieceEl) {

        if (!pieceEl.cgDragging) {
          pieceEl.cgDragging = true
          pieceEl.classList.add('dragging')
          if (state.draggable.magnified) {
            pieceEl.classList.add('magnified')
          }
          const ghost = dom.elements.ghost
          if (ghost && cur.showGhost) {
            ghost.className = `ghost ${cur.piece.color} ${cur.piece.role}`
            const translation = util.posToTranslate(
              util.key2pos(cur.orig, bs), bs, state.orientation === 'white', bounds
            )
            ghost.style.transform = util.transform(state, cur.piece.color, util.translate(translation))
          }
        }

        cur.pos = [
          cur.epos[0] - cur.rel[0],
          cur.epos[1] - cur.rel[1]
        ]

        cur.over = getKeyAtDomPos(state, cur.epos, bounds)

        // move piece
        const translate = util.posToTranslate(cur.origPos, bs, asWhite, bounds)
        translate[0] += cur.pos[0] + cur.dec[0]
        translate[1] += cur.pos[1] + cur.dec[1]
        pieceEl.style.transform = util.transform(state, cur.piece.color, util.translate3d(translate))

        // move square target
        const shadow = dom.elements.shadow
        if (shadow) {
          if (cur.over && cur.over !== cur.prevOver) {
            const sqSize = bounds.width / 8
            const pos =  util.key2pos(cur.over, bs)
            const translate = util.posToTranslate(pos, bs, asWhite, bounds)
            shadow.style.transform = util.translate3d([
              translate[0] - sqSize / 2,
              translate[1] - sqSize / 2
            ])
          } else if (!cur.over) {
            shadow.style.transform = util.translate3dAway
          }
          cur.prevOver = cur.over
        }
      }
      processDrag(ctrl)
    }
  })
}

function removeDragElements(dom?: cg.DOM) {
  if (!dom) return
  if (dom.elements.shadow) {
    dom.elements.shadow.style.transform = util.translate3dAway
  }
  if (dom.elements.ghost) {
    dom.elements.ghost.style.transform = util.translateAway
  }
}

