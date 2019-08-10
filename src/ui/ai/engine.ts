import { AiRoundInterface } from '../shared/round'
import { send, getNbCores, setOption, parseVariant } from '../../utils/scan'

interface LevelToNumber {
  [index: number]: number
}

const maxMoveTime = 8000
const maxSkill = 20
const levelToDepth: LevelToNumber = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 5,
  6: 8,
  7: 13,
  8: 21
}

export const levelToRating: LevelToNumber = {
  1: 1100,
  2: 1300,
  3: 1650,
  4: 1900,
  5: 2100,
  6: 2300,
  7: 2500,
  8: 2700
}

export interface EngineInterface {
  init(): Promise<void>
  search(initialFen: string, moves: string): void
  setLevel(level: number): Promise<void>
  exit(): Promise<void>
}

export default function(ctrl: AiRoundInterface): EngineInterface {
  let level = 1

  return {
    init() {
      return Scan.init(parseVariant(ctrl.data.game.variant.key))
        .then(onInit)
        .catch(console.error.bind(console))
    },

    search(initialFen: string, moves: string) {
      Scan.output((msg: string) => {
        console.debug('[scan >>] ' + msg)
        const match = msg.match(/^bestmove (\w{4})|^bestmove ([PNBRQ]@\w{2})/)
        if (match) {
          if (match[1]) ctrl.onEngineMove(match[1])
          else if (match[2]) ctrl.onEngineDrop(match[2])
        }
      })

      // console.info('engine search pos: ', `position fen ${initialFen} moves ${moves}`)
      setOption('Threads', getNbCores())
        .then(() => send(`position fen ${initialFen} moves ${moves}`))
        .then(() => send(`go movetime ${moveTime(level)} depth ${depth(level)}`))
    },

    setLevel(l: number) {
      level = l
      return setOption('Skill Level', String(skill(level)))
    },

    exit() {
      return Scan.exit()
    }
  }
}

function onInit() {
  return send('hub')
}

function moveTime(level: number) {
  return level * maxMoveTime / 8
}

function skill(level: number) {
  return Math.round((level - 1) * (maxSkill / 7))
}

function depth(level: number) {
  return levelToDepth[level]
}
