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
    ratingRangeMin: Number(settingsObj.ratingRangeMin()),
    ratingRangeMax: Number(settingsObj.ratingRangeMax())
  }
}

export function humanSetupFromPool(poolObj: Pool, rated: boolean): HumanSeekSetup {
  const mode = rated ? 1 : 0
  return {
    mode: mode as ModeId, 
    variant: 1, // standard
    timeMode: 1 as TimeModeId, // realTime
    time: poolObj.lim,
    increment: poolObj.inc,
    days: 2,
    color: 'random' as Color,
    ratingRangeMin: 800,
    ratingRangeMax: 2900
  }
}