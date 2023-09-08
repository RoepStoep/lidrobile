import { HumanSettings } from '../settings'
import { Session } from '../session'
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
    mode, 
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

export function makeRatingRange(user: Session, setup: HumanSeekSetup): string | null {
  const { ratingRangeMin, ratingRangeMax } = setup
  let perfKey: PerfKey = 'correspondence'
  switch (setup.variant) {
    case 1:
    case 3: {
      if (setup.timeMode === 1) {
        const time = setup.time * 60 + setup.increment * 40
        if (time < 30) perfKey = 'ultraBullet'
        else if (time < 180) perfKey = 'bullet'
        else if (time < 480) perfKey = 'blitz'
        else if (time < 1500) perfKey = 'rapid'
        else perfKey = 'classical'
      }
      break
    }
    case 6:
      perfKey = 'antidraughts'
      break
    case 8:
      perfKey = 'frysk'
      break
    case 9:
      perfKey = 'breakthrough'
      break
    case 10:
      perfKey = 'frisian'
      break
    case 11:
      perfKey = 'russian'
      break
    case 12:
      perfKey = 'brazilian'
      break
  }
  const perf = user.perfs[perfKey]
  if (perf && ratingRangeMin !== undefined && ratingRangeMax !== undefined) {
    return `${perf.rating + ratingRangeMin}-${perf.rating + ratingRangeMax}`
  } else {
    return null
  }
}
