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

const dbName = 'offlinePuzzles'

function fetch(userId: UserId, variant: VariantKey): Promise<UserOfflineData | null> {
  return asyncStorage.get<UserOfflineData>(`${dbName}.${userId}.${variant}`)
}

function save(userId: UserId, variant: VariantKey, userData: UserOfflineData): Promise<UserOfflineData> {
  return asyncStorage.set(`${dbName}.${userId}.${variant}`, userData)
}

function clean(userId: UserId, variant: VariantKey) {
  return asyncStorage.remove(`${dbName}.${userId}.${variant}`)
}
