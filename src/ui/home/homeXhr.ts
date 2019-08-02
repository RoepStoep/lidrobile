import { fetchJSON } from '../../http'
import { DailyPuzzle } from '../../lidraughts/interfaces'
import { OnlineGameData } from '../../lidraughts/interfaces/game'
import { TournamentListItem } from '../../lidraughts/interfaces/tournament'

interface FeaturedTournamentData {
  featured: TournamentListItem[]
}

export function featured(feedback: boolean): Promise<OnlineGameData> {
  return fetchJSON('/tv', undefined, feedback)
}

export function dailyPuzzle(): Promise<{ puzzle: DailyPuzzle }> {
  return fetchJSON('/training/daily', undefined, true)
}

export function featuredTournaments(): Promise<FeaturedTournamentData> {
  return fetchJSON('/tournament/featured', undefined, false)
}
