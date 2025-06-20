// https://github.com/ornicar/scalachess/blob/master/src/main/scala/Status.scala

import i18n from '../i18n'
import { GameData, GameStatus } from './interfaces/game'
import { AnalyseData } from './interfaces/analyse'
import { VariantKey } from './interfaces/variant'

const ids = {
  created: 10,
  started: 20,
  aborted: 25,
  mate: 30,
  resign: 31,
  timeout: 33,
  draw: 34,
  outoftime: 35,
  cheat: 36,
  noStart: 37,
  unknownFinish: 38,
  variantEnd: 60
}

function started(data: GameData | AnalyseData): boolean {
  return data.game.status.id >= ids.started
}

function finished(data: GameData | AnalyseData): boolean {
  return data.game.status.id >= ids.mate
}

export function finishedStatus(status: GameStatus): boolean {
  return status.id >= ids.aborted
}

function aborted(data: GameData | AnalyseData): boolean {
  return data.game.status.id === ids.aborted
}

function resigned(data: GameData | AnalyseData): boolean {
  return data.game.status.id === ids.resign
}

function toLabel(status: string, winner: Color | undefined, variant: VariantKey) {
  switch (status) {
    case 'started':
      return i18n('playingRightNow')
    case 'aborted':
      return i18n('gameAborted')
    case 'mate':
      return ''
    case 'resign':
      return i18n(winner === 'white' ? 'blackResigned' : 'whiteResigned')
    case 'timeout':
      switch (winner) {
        case 'white':
          return i18n('blackLeftTheGame')
        case 'black':
          return i18n('whiteLeftTheGame')
        default:
          return i18n('draw')
      }
    case 'draw':
      return i18n('draw')
    case 'outoftime':
      return i18n('timeOut')
    case 'noStart':
      return (winner === 'white' ? 'Black' : 'White') + ' didn\'t move'
    case 'unknownFinish':
      return i18n('finished')
    case 'cheat':
      return 'Cheat detected'
    case 'variantEnd':
      switch (variant) {
        case 'breakthrough':
          return 'Promotion'
        default:
          return 'Variant ending'
      }
    default:
      return status
  }
}

export default {
  ids,
  started,
  finished,
  aborted,
  resigned,
  toLabel
}
