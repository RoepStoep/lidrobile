import { PossibleDrops } from '../../../lidraughts/interfaces/game'

export default {
  drop(role: Role, key: Key, possibleDrops?: PossibleDrops | null) {

    if (role === 'man' && (key[1] === '1' || key[1] === '10')) return false

    if (possibleDrops === undefined || possibleDrops === null) return true

    const drops = Array.isArray(possibleDrops) ?
      possibleDrops : possibleDrops.match(/.{2}/g) || []

    return drops.indexOf(key) !== -1
  }
}
