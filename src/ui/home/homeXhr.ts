import { fetchJSON } from '../../http'
import { Streamer } from '../../lidraughts/interfaces'
import { PuzzleData } from '../../lidraughts/interfaces/training'
import { TournamentListItem } from '../../lidraughts/interfaces/tournament'

interface FeaturedTournamentData {
  featured: TournamentListItem[]
}

export function featuredStreamers(): Promise<readonly Streamer[]> {
  return fetchJSON('/api/streamer/featured', undefined)
}

export function dailyPuzzle(): Promise<PuzzleData> {
  return fetchJSON('/training/daily', undefined)
}

export function featuredTournaments(): Promise<FeaturedTournamentData> {
  return fetchJSON('/tournament/featured', undefined)
}
