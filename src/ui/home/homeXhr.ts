import { fetchCachedJSON } from '../../http'
import { Streamer } from '../../lidraughts/interfaces'
import { PuzzleData } from '../../lidraughts/interfaces/training'
import { TournamentListItem } from '../../lidraughts/interfaces/tournament'

interface FeaturedTournamentData {
  featured: TournamentListItem[]
}

export function featuredStreamers(): Promise<readonly Streamer[]> {
  return fetchCachedJSON(15, '/api/streamer/featured', undefined)
}

export function dailyPuzzle(): Promise<PuzzleData> {
  return fetchCachedJSON(60, '/training/daily', undefined)
}

export function featuredTournaments(): Promise<FeaturedTournamentData> {
  return fetchCachedJSON(30, '/tournament/featured', undefined)
}
