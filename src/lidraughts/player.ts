import i18n from '../i18n'
import { truncate } from '../utils'
import { LightPlayer } from './interfaces'
import { levelToRating } from '../ui/ai/engine'

export function lightPlayerName(player?: LightPlayer, withRating?: boolean): string {
  if (player) {
    const shortTitle = player.title ? player.title.endsWith('-64') ? player.title.slice(0, player.title.length - 3) : player.title : ''
    const playerName = player.user?.displayName || player.name
    return (shortTitle ? shortTitle + ' ' + playerName : playerName) + (
      withRating ? ' (' + player.rating + ')' : '')
  } else {
    return i18n('anonymous')
  }
}

// this is too polymorphic to be typed... needs a refactoring
export function playerName(player: any, withRating = false, tr = false, trLenght?: number): string {
  let name = player.user?.displayName || player.name || player.username || player.user?.username
  if (name) {
    if (player.user?.title) {
      const t = player.user.title, t64 = t.endsWith('-64')
      name = (t64 ? t.slice(0, t.length - 3) : t) + ' ' + name
    }
    if (tr) name = truncate(name, trLenght || 100)
    if (withRating && (player.user || player.rating)) {
      name += ' (' + (player.rating || player.user.rating)
      if (player.provisional) name += '?'
      name += ')'
    }
    return name
  }

  if (player.ai) {
    const name = aiName(player)
    return withRating ? name + ' (' + levelToRating[player.ai] + ')' : name
  }

  return i18n('anonymous')
}

export function aiName(player: { ai: number }) {
  return i18n('aiNameLevelAiLevel', 'Scan', player.ai)
}

