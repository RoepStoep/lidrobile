import { OnlineGameData, GameStep } from '../../../lidraughts/interfaces/game'

export function firstPly(d: OnlineGameData): number {
  return d.steps[0].ply
}

export function lastPly(d: OnlineGameData): number {
  return d.steps[d.steps.length - 1].ply
}

export function plyStep(d: OnlineGameData, ply: number): GameStep {
  return d.steps[ply - firstPly(d)]
}
