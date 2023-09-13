import { fetchJSON } from '../../http'
import { PuzzleData, PuzzleSyncData, RoundData, PuzzleOutcome } from '../../lidraughts/interfaces/training'

export function round(outcome: PuzzleOutcome): Promise<RoundData> {
  return fetchJSON(`/training/${outcome.variant}/${outcome.id}/round2`, {
    method: 'POST',
    body: JSON.stringify({
      win: outcome.win ? 1 : 0
    })
  })
}

export function vote(id: number, v: boolean, variant: string): Promise<[boolean, number]> {
  return fetchJSON(`/training/${variant}/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({
      vote: v ? 1 : 0
    })
  })
}

export function loadPuzzle(id: number, variant: string): Promise<PuzzleData> {
  return fetchJSON<PuzzleData>(`/training/${variant}/${id}/load`, { cache: 'reload' })
}

export function loadDailyPuzzle(): Promise<PuzzleData> {
  return fetchJSON('/training/daily', undefined)
}

export function newPuzzle(variant: string): Promise<PuzzleData> {
  return fetchJSON<PuzzleData>(`/training/${variant}/new`)
}

export function newPuzzlesBatch(variant: string, num: number, after?: number): Promise<PuzzleSyncData> {
  return fetchJSON<PuzzleSyncData>(`/training/${variant}/batch`, {
    method: 'GET',
    query: { nb: num, after },
    cache: 'reload',
  })
}

export function solvePuzzlesBatch(variant: string, outcomes: ReadonlyArray<PuzzleOutcome>): Promise<void> {
  return fetchJSON(`/training/${variant}/batch`, {
    method: 'POST',
    body: JSON.stringify({
      solutions: outcomes
    })
  })
}
