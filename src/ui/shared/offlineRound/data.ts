import session from '../../../session'
import { oppositeColor, animationDuration } from '../../../utils'
import settings from '../../../settings'
import i18n from '../../../i18n'
import { getInitialFen, getLidraughtsVariant } from '../../../lidraughts/variant'
import { OfflineGameData } from '../../../lidraughts/interfaces/game'
import { ClockState } from '../clock/interfaces'

export interface OfflineDataConfig {
  id: string
  variant: Variant
  initialFen: string
  fen: string
  color: Color
  player: Color
  pref?: {
    centerPiece: boolean
  }
  clock?: ClockState,
  captureLength?: number
}

export default function data(cfg: OfflineDataConfig): OfflineGameData {

  const confColor = cfg.color || 'white'

  const player = {
    color: confColor,
    username: cfg.id === 'offline_ai' ? session.appUser(i18n(confColor)) : i18n(confColor),
    spectator: false
  }

  const variant = cfg.variant || getLidraughtsVariant('standard')
  const standardFen = getInitialFen(variant.key)
  return {
    game: {
      id: cfg.id,
      offline: true,
      variant,
      initialFen: cfg.initialFen || standardFen,
      source: 'offline',
      fen: cfg.fen || standardFen,
      player: cfg.player || 'white',
      turns: 0,
      startedAtTurn: 0,
      status: {
        id: 20,
        name: 'created'
      },
      speed: 'unlimited',
      createdAt: Date.now()
    },
    player,
    opponent: {
      color: oppositeColor(confColor),
      username: i18n(oppositeColor(confColor))
    },
    pref: {
      animationDuration: animationDuration(settings.game.animations()),
      centerPiece: cfg.pref && cfg.pref.centerPiece || false
    },
    steps: [],
    captureLength: cfg.captureLength,
    offlineClock: cfg.clock
  }
}
