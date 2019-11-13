import asyncStorage from '../asyncStorage'
import { AnalyseData } from '../lidraughts/interfaces/analyse'
import { OnlineGameData, OfflineGameData } from '../lidraughts/interfaces/game'
import { GameSituation } from '../draughts'

const OTB_STORAGE_KEY = 'otb.current'
const AI_STORAGE_KEY = 'ai.current'

export interface StoredOfflineGame {
  data: OfflineGameData
  situations: Array<GameSituation>
  ply: number
}

export type StoredOfflineGames = { [id: string]: OnlineGameData }

export function getCurrentOTBGame(): Promise<StoredOfflineGame | null> {
  return asyncStorage.get<StoredOfflineGame>(OTB_STORAGE_KEY)
}

export function setCurrentOTBGame(game: StoredOfflineGame): Promise<StoredOfflineGame> {
  return asyncStorage.set(OTB_STORAGE_KEY, game)
}

export function getCurrentAIGame(): Promise<StoredOfflineGame | null> {
  return asyncStorage.get<StoredOfflineGame>(AI_STORAGE_KEY)
}

export function setCurrentAIGame(game: StoredOfflineGame): Promise<StoredOfflineGame> {
  return asyncStorage.set(AI_STORAGE_KEY, game)
}

export function getAnalyseData(data: StoredOfflineGame, orientation: Color): AnalyseData | null {
  if (!data) return null
  const aData = data.data as any
  (aData as AnalyseData).orientation = orientation
  aData.treeParts = data.situations.map((o: GameSituation) => {
    const node = {
      // bc layer TODO remove in version 5.4
      id: o.id || (o as any).nodeId,
      fen: o.fen,
      ply: o.ply,
      kingMoves: o.kingMoves,
      // uciMoves contains at least situation last move
      // bc layer TODO remove in version 5.4
      uci: o.uci || o.uciMoves[o.uciMoves.length - 1],
      san: o.san || o.pdnMoves.length ? o.pdnMoves[o.pdnMoves.length - 1] : undefined,
      dests: o.dests,
      drops: o.drops,
      captLen: o.captureLength,
      pdnMoves: o.pdnMoves,
      end: o.end,
      player: o.player,
      children: []
    }
    return node
  })
  return aData as AnalyseData
}
