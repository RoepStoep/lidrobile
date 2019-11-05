import asyncStorage from '../../asyncStorage'
import { PuzzleOutcome, PuzzleData, UserData } from '../../lidraughts/interfaces/training'

const db = {
  fetch,
  save,
  clean
}

export default db

export type Database = typeof db

export interface UserOfflineData {
  user: UserData
  solved: ReadonlyArray<PuzzleOutcome>
  unsolved: ReadonlyArray<PuzzleData>
}

type UserId = string

function fetch(userId: UserId, variant: VariantKey): Promise<UserOfflineData | null> {
  return asyncStorage.get<UserOfflineData>(`offlinePuzzles.${userId}.${variant}`)
}

function save(userId: UserId, variant: VariantKey, userData: UserOfflineData): Promise<UserOfflineData> {
  return asyncStorage.set(`offlinePuzzles.${userId}.${variant}`, userData)
}

function clean(userId: UserId, variant: VariantKey) {
  return asyncStorage.remove(`offlinePuzzles.${userId}.${variant}`)
}
