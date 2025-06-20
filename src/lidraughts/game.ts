import i18n, { plural } from '../i18n'
import { secondsToMinutes } from '../utils'
import settings from '../settings'
import gameStatus from './status'
import { getVariant } from './variant'
import { shortPerfTitle } from './perfs'
import { FeaturedGame } from './interfaces'
import { UserGame } from './interfaces/user'
import { GameData, OnlineGameData, Player } from './interfaces/game'
import { AnalyseData, OnlineAnalyseData } from './interfaces/analyse'
import { isSynthetic } from '~/ui/analyse/util'

export const analysableVariants = ['standard', 'antidraughts', 'breakthrough', 'fromPosition', 'frisian', 'frysk']
export const puzzleVariants = ['standard', 'frisian']

export function parsePossibleMoves(dests?: StringMap | string): DestsMap {
  if (!dests) return {}
  const dec: DestsMap = {}
  if (typeof dests === 'string')
    dests.split(' ').forEach(ds => {
      dec[ds.slice(0, 2)] = ds.slice(2).match(/.{2}/g) as Key[]
    })
    else for (const k in dests) dec[k] = dests[k]!.match(/.{2}/g) as Key[]
  return dec
}

export function playable(data: GameData | AnalyseData): boolean {
  return data.game.source !== 'import' && data.game.status.id < gameStatus.ids.aborted
}

export function isPlayerPlaying(data: GameData | AnalyseData) {
  return playable(data) && !data.player.spectator
}

export function isPlayerTurn(data: GameData) {
  return isPlayerPlaying(data) && data.game.player === data.player.color
}

export function isOpponentTurn(data: GameData) {
  return isPlayerPlaying(data) && data.game.player !== data.player.color
}

export function mandatory(data: OnlineGameData) {
  return !!data.tournament || !!data.simul || !!data.swiss
}

export function playedTurns(data: OnlineGameData | AnalyseData) {
  return data.game.turns - (data.game.startedAtTurn || 0)
}

export function bothPlayersHavePlayed(data: OnlineGameData): boolean {
  return playedTurns(data) > 1
}

export function abortable(data: OnlineGameData) {
  return playable(data) && !bothPlayersHavePlayed(data) && !mandatory(data)
}

export function takebackable(data: OnlineGameData): boolean {
  return !!(playable(data) && data.takebackable && !mandatory(data) && playedTurns(data) > 1 && !data.player.proposingTakeback && !data.opponent.proposingTakeback)
}

export function drawable(data: OnlineGameData) {
  return playable(data) && data.game.turns >= 2 &&
    !data.player.offeringDraw && !data.opponent.offeringDraw &&
    !data.opponent.ai && (
      data.drawLimit === undefined || 
      (data.drawLimit > 0 && data.game.turns >= data.drawLimit * 2)
    )
}

export function berserkableBy(data: OnlineGameData) {
  return data.tournament &&
    data.tournament.berserkable &&
    isPlayerPlaying(data) &&
    playedTurns(data) < 2
}

export function resignable(data: OnlineGameData) {
  return playable(data) && !abortable(data)
}

export function forceResignable(data: OnlineGameData) {
  return !data.opponent.ai && data.clock && data.opponent.isGone && resignable(data)
}

export function moretimeable(data: OnlineGameData) {
  return isPlayerPlaying(data) && data.moretimeable && !mandatory(data) && (
    !!data.clock || (
      !!data.correspondence &&
      data.correspondence[data.opponent.color] < (data.correspondence.increment - 3600)
    )
  )
}

export function threefoldable(data: GameData) {
  return data.game.variant.key !== 'frisian' && data.game.variant.key !== 'frysk'
}

export function imported(data: GameData | AnalyseData) {
  return data.game.source === 'import'
}

export function replayable(data: GameData | AnalyseData) {
  return imported(data) || gameStatus.finished(data)
}

export function userAnalysable(data: GameData) {
  return settings.analyse.supportedVariants.indexOf(data.game.variant.key) !== -1 && playable(data) && (!data.clock || !isPlayerPlaying(data))
}

export function analysable(data: OnlineGameData | OnlineAnalyseData) {
  return replayable(data) && playedTurns(data) > 4 && analysableVariants.indexOf(data.game.variant.key) !== -1
}

export function getPlayer(data: GameData | AnalyseData, color?: Color): Player | undefined {
  if (data.player.color === color) return data.player
  if (data.opponent.color === color) return data.opponent
}

export function setIsGone(data: GameData, color: Color, isGone: boolean) {
  const player = getPlayer(data, color)
  if (player) {
    isGone = isGone && !player.ai
    player.isGone = isGone
    if (!isGone && player.user) player.user.online = true
  }
}

export function setOnGame(data: GameData, color: Color, onGame: boolean) {
  const player = getPlayer(data, color)
  if (player) {
    onGame = onGame || !!player.ai
    player.onGame = onGame
    if (onGame) setIsGone(data, color, false)
  }
}

export function nbMoves(data: OnlineGameData, color: Color) {
  return Math.floor((data.game.turns + (color === 'white' ? 1 : 0)) / 2)
}

export function result(data: GameData) {
  if (gameStatus.finished(data)) switch (data.game.winner) {
    case 'white':
      return settings.game.draughtsResult() ? '2-0' : '1-0'
    case 'black':
      return settings.game.draughtsResult() ? '0-2' : '0-1'
    default:
      return settings.game.draughtsResult() ? '1-1' : '½-½'
  }
  return '*'
}

// FIXME
export function time(data: GameData | UserGame | AnalyseData | FeaturedGame) {
  if (data.clock) {
    const min = secondsToMinutes(data.clock.initial)
    const t = min === 0.25 ? '¼' : min === 0.5 ? '½' : min === 0.75 ? '¾' : min.toString()
    return t + '+' + data.clock.increment
  }
  else if (data.correspondence) {
    return plural('nbDays', data.correspondence.daysPerTurn)
  }
  else {
    return '∞'
  }
}

export function title(data: GameData | AnalyseData): string {
  const mode = data.game.offline ?
    i18n('offline') :
    data.game.rated ? i18n('rated') : i18n('casual')

  const perf = data.game.perf && shortPerfTitle(data.game.perf)
  const variant = getVariant(data.game.variant.key)
  const name = perf || variant.tinyName || variant.shortName || variant.name || '?'
  const t = time(data)
  return data.game.source === 'import' ?
    'Import • Standard' :
    `${t} • ${name} • ${mode}`
}

export function publicUrl(data: GameData): string {
  return 'https://lidraughts.org/' + data.game.id
}

export function publicAnalyseUrl(data: AnalyseData) {
  return 'https://lidraughts.org/' + data.game.id + '/' + data.orientation
}

export function isSupportedVariant(data: GameData) {
  return settings.game.supportedVariants.indexOf(data.game.variant.key) !== -1
}

export function isSupportedVariantKey(key: VariantKey) {
  return settings.game.supportedVariants.indexOf(key) !== -1
}

export function isSupportedPerf(key: PerfKey) {
  return settings.game.supportedPerfs.indexOf(key) !== -1
}

export function forecastable(data: GameData | AnalyseData): boolean {
  return playable(data) && !isSynthetic(data) && data.game.speed === 'correspondence'
}
