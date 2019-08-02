import * as gameApi from '../../../../lidraughts/game'
import { GameData, PossibleDrops } from '../../../../lidraughts/interfaces/game'

export default {
  drop(data: GameData, role: Role, key: Key, possibleDrops?: PossibleDrops) {

    if (!data.game.offline && !gameApi.isPlayerTurn(data)) return false

    if (role === 'man' && (key[1] === '1' || key[1] === '10')) return false

    if (possibleDrops === undefined || possibleDrops === null) return true

    const drops = Array.isArray(possibleDrops) ?
      possibleDrops : possibleDrops.match(/.{2}/g) || []

    return drops.indexOf(key) !== -1
  }
}
