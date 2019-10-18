import { HumanSettings } from '../settings'
import { ModeId, TimeModeId, HumanSeekSetup, Pool } from './interfaces'

export function humanSetupFromSettings(settingsObj: HumanSettings): HumanSeekSetup {
  return {
    mode: Number(settingsObj.mode()) as ModeId,
    variant: Number(settingsObj.variant()),
    timeMode: Number(settingsObj.timeMode()) as TimeModeId,
    time: Number(settingsObj.time()),
    increment: Number(settingsObj.increment()),
    days: Number(settingsObj.days()),
    color: settingsObj.color() as Color,
    ratingMin: Number(settingsObj.ratingMin()),
    ratingMax: Number(settingsObj.ratingMax())
  }
}

export function humanSetupFromPool(poolObj: Pool): HumanSeekSetup {
  return {
    mode: 1 as ModeId, // rated
    variant: 1, // standard
    timeMode: 1 as TimeModeId, // realTime
    time: poolObj.lim,
    increment: poolObj.inc,
    days: 2,
    color: 'random' as Color,
    ratingMin: 800,
    ratingMax: 2900
  }
}