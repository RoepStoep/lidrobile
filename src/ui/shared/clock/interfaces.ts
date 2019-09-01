import { StoredProp } from '../../../storage'

export type ClockType = 'simple' | 'increment' | 'handicapInc' | 'delay' | 'bronstein' | 'hourglass' | 'stage'
export type ClockTypeWithNone = ClockType | 'none'

export interface IBasicClock {
  clockType: ClockType
  getState(): ClockState
  setState(state: ClockState): void
  whiteTime(): number
  blackTime(): number
  getTime(color: Color): number
  activeSide(): Color | undefined
  flagged(): Color | undefined
  isRunning(): boolean
  clockHit(side: Color): void
  startStop(): void
  clear(): void
  toggleActiveSide(): void
}

export interface Stage { time: number, moves: number | null }

export interface StageSetting { time: string, moves: string | null }

export interface IStageClock extends IBasicClock {
  whiteMoves(): number | null
  blackMoves(): number | null
  getMoves(color: Color): number | null
}

export type IDraughtsClock = IBasicClock | IStageClock

export interface IDraughtsBasicClockState {
  clockType: ClockType
  whiteTime: number
  blackTime: number
  activeSide: Color | undefined
  flagged: Color | undefined
  isRunning: boolean
}

export interface IDraughtsHandicapIncClockState extends IDraughtsBasicClockState {
  whiteIncrement: number
  blackIncrement: number
}

export interface IDraughtsDelayClockState extends IDraughtsBasicClockState {
  whiteDelay: number
  blackDelay: number
  increment: number
}

export interface IDraughtsStageClockState extends IDraughtsBasicClockState {
  whiteMoves: number | null
  blackMoves: number | null
  whiteStage: number
  blackStage: number
  stages: Stage[]
  increment: number
}

export type ClockState = IDraughtsBasicClockState | IDraughtsHandicapIncClockState | IDraughtsDelayClockState | IDraughtsStageClockState | null

export type ClockSettings = ClockClockSettings | OtbClockSettings

export interface ClockClockSettings extends BaseClockSettings {
  clockType: StoredProp<ClockType>,
}

export interface OtbClockSettings extends BaseClockSettings {
  clockType: StoredProp<ClockTypeWithNone>,
}

export interface BaseClockSettings {
  availableClocks: Array<Array<string>>,

  simple: {
    time: StoredProp<string>
  },

  increment: {
    time: StoredProp<string>,
    increment: StoredProp<string>
  },

  handicapInc: {
    topTime: StoredProp<string>,
    topIncrement: StoredProp<string>,
    bottomTime: StoredProp<string>,
    bottomIncrement: StoredProp<string>
  },

  delay: {
    time: StoredProp<string>,
    increment: StoredProp<string>
  },

  bronstein: {
    time: StoredProp<string>,
    increment: StoredProp<string>
  },

  hourglass: {
    time: StoredProp<string>
  },

  stage: {
    stages: StoredProp<Array<StageSetting>>,
    increment: StoredProp<string>
  },

  availableTimes: Array<Array<string>>,

  availableIncrements: Array<string>,

  availableMoves: Array<string>
}
