import { OnlineGameData, GameStep } from '../../../lidraughts/interfaces/game'
import { batchRequestAnimationFrame } from '../../../utils/batchRAF'
import * as helper from '../../helper'
import { RoundInterface } from '.'
import { countGhosts } from '../../../draughtsground/fen'

export function firstPly(d: OnlineGameData): number {
  return d.steps[0].ply
}

export function lastPly(d: OnlineGameData): number {
  return d.steps[d.steps.length - 1].ply
}

export function plyStep(d: OnlineGameData, ply: number): GameStep {
  return d.steps[ply - firstPly(d)]
}

export function autoScroll(movelist?: HTMLElement) {
  if (!movelist) return
  batchRequestAnimationFrame(() => {
    const plyEl = movelist.querySelector('.current') as HTMLElement
    if (plyEl) movelist.scrollTop = plyEl.offsetTop - movelist.offsetHeight / 2 + plyEl.offsetHeight / 2
  })
}

export function autoScrollInline(movelist?: HTMLElement) {
  if (!movelist) return
  batchRequestAnimationFrame(() => {
    const plyEl = movelist.querySelector('.current') as HTMLElement
    if (plyEl) movelist.scrollLeft = plyEl.offsetLeft - movelist.offsetWidth / 2 + plyEl.offsetWidth / 2
  })
}

export function getMoveEl(e: Event) {
  const target = (e.target as HTMLElement)
  return target.tagName === 'MOVE' ? target :
    helper.findParentBySelector(target, 'move')
}

export function onReplayTap(ctrl: RoundInterface, e: Event) {
  const el = getMoveEl(e)
  if (el && el.dataset.ply) {
    ctrl.jump(Number(el.dataset.ply))
  }
}

export function mergeStep(originalStep: GameStep, mergeStep: GameStep) {
  originalStep.ply = mergeStep.ply
  originalStep.fen = mergeStep.fen
  originalStep.san = (originalStep.san !== null && mergeStep.san !== null) ? (originalStep.san.slice(0, originalStep.san.indexOf('x') + 1) + mergeStep.san.substr(mergeStep.san.indexOf('x') + 1)) : originalStep.san
  originalStep.uci = (originalStep.uci !== null && mergeStep.uci !== null) ? (originalStep.uci + mergeStep.uci.substr(2, 2)) : originalStep.uci
}

export function addStep(steps: GameStep[], newStep: GameStep): GameStep {
  if (steps.length === 0 || countGhosts(steps[steps.length - 1].fen) === 0)
    steps.push(newStep)
  else
    mergeStep(steps[steps.length - 1], newStep)

  if (countGhosts(steps[steps.length - 1].fen) > 0)
    steps[steps.length - 1].ply++

  return steps[steps.length - 1]
}

export function mergeSteps(steps: GameStep[]): GameStep[] {
  const mergedSteps: GameStep[] = []
  if (steps.length === 0) return mergedSteps
  else mergedSteps.push(steps[0])

  if (steps.length === 1) return mergedSteps

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i - 1]
    if (step.captLen === undefined || step.captLen < 2 || step.ply < steps[i].ply) {
        // captures split over multiple steps have the same ply. If a multicapture is reported in one step, the ply does increase
        mergedSteps.push(steps[i])
    } else {

        const originalStep = steps[i]
        for (let m = 0; m < step.captLen - 1 && i + 1 < steps.length; m++) {
            if (m === 0) {
              originalStep.uci = originalStep.uci!.slice(0, 4)
            } else if (steps[i].uci!.slice(-2) !== steps[i + 1].uci!.slice(0, 2)) {
              break
            }
            i++
            mergeStep(originalStep, steps[i])
        }
        if (countGhosts(originalStep.fen) > 0)
            originalStep.ply++

        mergedSteps.push(originalStep)
    }
  }
  return mergedSteps
}
