import { batchRequestAnimationFrame } from '../utils/batchRAF'
import * as cg from './interfaces'
import * as util from './util'
import { State } from './state'
import { calcCaptKey } from './board'
import Draughtsground from './Draughtsground'

export type Mutation<A> = (state: State) => A

// 0,1 animation goal
// 2,3 animation current status
// 4   x-shifting parameter
export type AnimVector = NumberQuadShift

export interface AnimVectors {
  [key: string]: AnimVector
}

export interface AnimCaptures {
  [key: string]: Piece
}

export interface AnimRoles {
  [key: string]: Role
}

export interface AnimPlan {
  anims: AnimVectors
  captures: AnimCaptures
  tempRole: AnimRoles
  nextPlan?: AnimPlan
}

export interface AnimCurrent {
  start: number | null
  frequency: cg.KHz
  plan: AnimPlan
  lastMove: Key[] | null
}

interface AnimPiece {
  key: Key
  pos: cg.Pos
  piece: Piece
}

interface AnimPieces {
  [key: string]: AnimPiece
}

interface SamePieces { [key: string]: boolean }

export function anim<A>(mutation: Mutation<A>, ctrl: Draughtsground, fadeOnly = false, noCaptSequences = false): A {
  return ctrl.state.animation.enabled ? animate(mutation, ctrl, fadeOnly, noCaptSequences) : skip(mutation, ctrl)
}

export function skip<A>(mutation: Mutation<A>, ctrl: Draughtsground): A {
  const result = mutation(ctrl.state)
  ctrl.redraw()
  return result
}

export function animationDuration(state: State) {
  const anim = state.animation.current
  if (!anim) return 0
  let plan = anim.plan, total
  const factor = (plan.nextPlan && !util.isObjectEmpty(plan.nextPlan.anims)) ? 2.2 : 1,
    duration = state.animation.duration / factor
  total = duration
  while (plan.nextPlan && !util.isObjectEmpty(plan.nextPlan.anims)) {
    plan = plan.nextPlan
    total += duration
  }
  return total
}

function makePiece(key: Key, boardSize: cg.BoardSize, piece: Piece): AnimPiece {
  return {
    key,
    pos: util.key2pos(key, boardSize),
    piece
  }
}

function samePiece(p1: Piece, p2: Piece) {
  return p1.role === p2.role && p1.color === p2.color
}

function closer(piece: AnimPiece, pieces: AnimPiece[]) {
  return pieces.sort((p1, p2) => {
    return util.distance(piece.pos, p1.pos) - util.distance(piece.pos, p2.pos)
  })[0]
}

function ghostPiece(piece: Piece): Piece {
  if (piece.role === 'man')
    return { role: 'ghostman', color: piece.color, promoted: piece.promoted, kingMoves: piece.kingMoves }
  else if (piece.role === 'king')
    return { role: 'ghostking', color: piece.color, promoted: piece.promoted, kingMoves: piece.kingMoves }
  else
    return { role: piece.role, color: piece.color, promoted: piece.promoted, kingMoves: piece.kingMoves }
}

function isPromotable(p: AnimPiece, boardSize: cg.BoardSize): boolean {
  return (p.piece.color === 'white' && p.pos[1] === 1) || (p.piece.color === 'black' && p.pos[1] === boardSize[1])
}

function computePlan(prevPieces: cg.Pieces, current: State, fadeOnly = false, noCaptSequences = false): AnimPlan {
  const missingsW: AnimPiece[] = [], missingsB: AnimPiece[] = []
  let newsW: AnimPiece[] = [], newsB: AnimPiece[] = []
  const prePieces: AnimPieces = {},
    samePieces: SamePieces = {},
    bs = current.boardSize
  let curP: Piece, preP: AnimPiece, i: any, prevGhosts = 0
  for (i in prevPieces) {
    prePieces[i] = makePiece(i as Key, bs, prevPieces[i])
    if (prevPieces[i].role === 'ghostman' || prevPieces[i].role === 'ghostking')
      prevGhosts++
  }
  for (const key of util.allKeys) {
    curP = current.pieces[key]
    preP = prePieces[key]
    if (curP) {
      if (preP) {
        if (!samePiece(curP, preP.piece)) {
          if (preP.piece.color === 'white')
            missingsW.push(preP)
          else
            missingsB.push(preP)
          if (curP.color === 'white')
            newsW.push(makePiece(key, bs, curP))
          else
            newsB.push(makePiece(key, bs, curP))
        }
      } else {
        if (curP.color === 'white')
          newsW.push(makePiece(key, bs, curP))
        else
          newsB.push(makePiece(key, bs, curP))
      }
    } else if (preP) {
      if (preP.piece.color === 'white')
        missingsW.push(preP)
      else
        missingsB.push(preP)
    }
  }

  const plan: AnimPlan = { anims: {}, captures: {}, tempRole: {} }
  let nextPlan: AnimPlan = { anims: {}, captures: {}, tempRole: {} }

  if (newsW.length > 1 && missingsW.length > 0) {
    newsW = newsW.sort((p1, p2) => {
      return util.distance(missingsW[0].pos, p1.pos) - util.distance(missingsW[0].pos, p2.pos)
    })
  }
  if (newsB.length > 1 && missingsB.length > 0) {
    newsB = newsB.sort((p1, p2) => {
      return util.distance(missingsB[0].pos, p1.pos) - util.distance(missingsB[0].pos, p2.pos)
    })
  }

  //Never animate capture sequences with ghosts on board, fixes retriggered animation when startsquare is touched again later in the sequence
  const captAnim = !noCaptSequences && (prevGhosts === 0 || current.animateFrom) && current.lastMove && current.lastMove.length > 2
  const animateFrom = current.animateFrom || 0

  //Animate captures with same start/end square
  if (!fadeOnly && captAnim && current.lastMove && current.lastMove[animateFrom] === current.lastMove[current.lastMove.length - 1]) {
    const doubleKey = current.lastMove[animateFrom]
    curP = current.pieces[doubleKey]
    preP = prePieces[doubleKey]
    if (curP.color === 'white' && missingsB.length !== 0) {
      missingsW.push(preP)
      newsW.push(makePiece(doubleKey, bs, curP))
    } else if (curP.color === 'black' && missingsW.length !== 0) {
      missingsB.push(preP)
      newsB.push(makePiece(doubleKey, bs, curP))
    }
  }

  const missings: AnimPiece[] = missingsW.concat(missingsB),
    news: AnimPiece[] = newsW.concat(newsB)

  news.forEach(newP => {
    preP = closer(newP, missings.filter(p =>
      !samePieces[p.key] &&
      newP.piece.color === p.piece.color &&
      (
        newP.piece.role === p.piece.role ||
        (p.piece.role === 'man' && newP.piece.role === 'king' && isPromotable(newP, bs)) ||
        (p.piece.role === 'king' && newP.piece.role === 'man' && isPromotable(p, bs))
      )
    ))
    if (preP && !fadeOnly) {
      samePieces[preP.key] = true
      const tempRole: Role | undefined = (preP.piece.role === 'man' && newP.piece.role === 'king' && isPromotable(newP, bs)) ? 'man' : undefined
      if (captAnim && current.lastMove && current.lastMove[animateFrom] === preP.key && current.lastMove[current.lastMove.length - 1] === newP.key) {

        let lastPos: cg.Pos = util.key2pos(current.lastMove[animateFrom + 1], bs), newPos: cg.Pos
        plan.anims[newP.key] = getVector(preP.pos, lastPos)
        plan.nextPlan = nextPlan
        if (tempRole) plan.tempRole[newP.key] = tempRole

        const captKeys: Array<Key> = new Array<Key>()
        let captKey = calcCaptKey(prevPieces, bs, preP.pos[0], preP.pos[1], lastPos[0], lastPos[1])
        if (captKey !== null) {
          captKeys.push(captKey)
          prevPieces[captKey] = ghostPiece(prevPieces[captKey])
        }

        plan.captures = {}
        missings.forEach(p => {
          if (p.piece.color !== newP.piece.color) {
            if (captKeys.indexOf(p.key) !== -1)
              plan.captures[p.key] = ghostPiece(p.piece)
            else
              plan.captures[p.key] = p.piece
          }
        })

        let newPlan: AnimPlan = { anims: {}, captures: {}, tempRole: {} }
        for (i = animateFrom + 2; i < current.lastMove.length; i++) {

          newPos = util.key2pos(current.lastMove[i], bs)

          nextPlan.anims[newP.key] = getVector(lastPos, newPos)
          nextPlan.anims[newP.key][2] = lastPos[0] - newP.pos[0]
          nextPlan.anims[newP.key][3] = lastPos[1] - newP.pos[1]
          nextPlan.nextPlan = newPlan
          if (tempRole) nextPlan.tempRole[newP.key] = tempRole

          captKey = calcCaptKey(prevPieces, bs, lastPos[0], lastPos[1], newPos[0], newPos[1])
          if (captKey !== null) {
            captKeys.push(captKey)
            prevPieces[captKey] = ghostPiece(prevPieces[captKey])
          }

          nextPlan.captures = {}
          missings.forEach(p => {
            if (p.piece.color !== newP.piece.color) {
              if (captKeys.indexOf(p.key) !== -1)
                nextPlan.captures[p.key] = ghostPiece(p.piece)
              else
                nextPlan.captures[p.key] = p.piece
            }
          })

          lastPos = newPos
          nextPlan = newPlan

          newPlan = { anims: {}, captures: {}, tempRole: {} }

        }

      } else {
        plan.anims[newP.key] = getVector(preP.pos, newP.pos)
        if (tempRole) plan.tempRole[newP.key] = tempRole
      }
    }
  })

  return plan

}

function getVector(preP: cg.Pos, newP: cg.Pos): AnimVector {
  if (preP[1] % 2 === 0 && newP[1] % 2 === 0)
    return [preP[0] - newP[0], preP[1] - newP[1], 0, 0, -0.5]
  else if (preP[1] % 2 !== 0 && newP[1] % 2 === 0)
    return [preP[0] - newP[0] + 0.5, preP[1] - newP[1], 0, 0, -0.5]
  else if (preP[1] % 2 === 0 && newP[1] % 2 !== 0)
    return [preP[0] - newP[0] - 0.5, preP[1] - newP[1], 0, 0, 0]
  else
    return [preP[0] - newP[0], preP[1] - newP[1], 0, 0, 0]
}

function animate<A>(mutation: Mutation<A>, ctrl: Draughtsground, fadeOnly = false, noCaptSequences = false): A {
  const state = ctrl.state
  const prevPieces: cg.Pieces = {...state.pieces}
  const result = mutation(state)
  const plan = ctrl.dom !== undefined ?
    computePlan(prevPieces, state, fadeOnly, noCaptSequences) : undefined
  if (plan !== undefined && !util.isObjectEmpty(plan.anims)) {
    const alreadyRunning = state.animation.current && state.animation.current.start !== null
    state.animation.current = {
      start: null,
      frequency: ((plan.nextPlan && !util.isObjectEmpty(plan.nextPlan.anims)) ? 2.2 : 1) / state.animation.duration,
      plan: plan,
      lastMove: state.lastMove
    }
    if (!alreadyRunning) {
      batchRequestAnimationFrame(ctrl.applyAnim)
    }
  } else {
    if (state.animation.current !== null && !sameArray(state.animation.current.lastMove, state.lastMove))
      state.animation.current = null
    ctrl.redraw()
  }
  return result
}

function sameArray(ar1: Array<any> | null, ar2: Array<any> | null) {
  if (ar1 === null && ar2 === null) return true
  if (ar1 === null || ar2 === null || ar1.length !== ar2.length)
    return false
  for (let i = 0; i < ar1.length; i++) {
    if (ar1[i] !== ar2[i])
      return false
  }
  return true
}
