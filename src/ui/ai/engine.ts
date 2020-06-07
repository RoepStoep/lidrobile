import { AiRoundInterface } from '../shared/round'
import { send, getNbCores, setOption, parsePV, parseVariant, scanFen } from '../../utils/scan'

interface LevelToNumber {
  [index: number]: number
}

// same for all
const LVL_MOVETIMES =    [50,  100,  150,  200,  300,  400,  500, 1000]
const LVL_BOOK_PLY = 	   [4,   4,    4,    4,    6,    6,    8,   8   ]
const LVL_BOOK_MARGIN =  [100, 100,  90,   90,   80,   70,   60,  50  ]

// normal / bt
const LVL_DEPTHS = 	     [0,   0,    0,    0,    6,    5,    11,  21  ]
const LVL_NODES = 	     [50,  120,  400,  1200, 0,    0,    0,   0   ]
const LVL_PST = 		     [1,   1,    1,    1,    1,    0,    0,   0   ]
const LVL_HANDICAPS =    [3,   2,    0,    0,    0,    0,    0,   0   ]

// frisian
const LVL_DEPTHS_FR =    [0,   0,    0,    0,    0,    0,    9,   21  ]
const LVL_NODES_FR = 	   [20,  50,   150,  450,  2200, 4400, 0,   0   ]
const LVL_HANDICAPS_FR = [3,   3,    3,    2,    2,    0,    0,   0   ]

// frysk
const LVL_DEPTHS_FY =    [0,   0,    0,    0,    0,    0,    11,  21  ]
const LVL_NODES_FY = 	   [50,  200,  600,  1800, 2400, 9600, 0,   0   ]
const LVL_HANDICAPS_FY = [3,   3,    2,    2,    2,    2,    0,   0   ]
const LVL_PST_FY = 	     [1,   1,    1,    1,    0,    0,    0,   0   ]

// losing
const LVL_DEPTHS_L = 	   [3,   4,    5,    6,    8,    10,   12,  19  ]
const LVL_PLY_L = 	     [4,   5,    7,    8,    11,   14,   17,  0   ]
const LVL_PST_L = 	     [1,   1,    1,    0,    0,    0,    0,   0   ]
const LVL_HANDICAPS_L =  [0,   0,    0,    0,    0,    0,    0,   0   ]
const LVL_NODES_L = 	   [0,   0,    0,    0,    0,    0,    0,   0   ]

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
  init(variant: VariantKey): Promise<void>
  search(level: number, initialFen: string, currentFen: string, moves: string[]): void
  exit(): Promise<void>
  variant(): VariantKey
}

export default function(ctrl: AiRoundInterface): EngineInterface {
  const uciCache: any = {}
  let initVariant: VariantKey = ctrl.data ? ctrl.data.game.variant.key : 'standard'
  let level = 1

  return {
    init(v: VariantKey) {
      initVariant = v
      return Scan.init(parseVariant(initVariant))
        .then(onInit)
        .catch(console.error.bind(console))
    },

    search(l: number, initialFen: string, currentFen: string, moves: string[]) {
      Scan.output((msg: string) => {
        console.debug('[scan >>] ' + msg)
        const match = msg.match(/^done move=([0-9\-xX\s]+)/)
        if (match) {
          ctrl.onEngineMove(parsePV(currentFen, match[1], initVariant === 'frisian' || initVariant === 'frysk', uciCache)[0])
        }
      })

      initialFen = scanFen(initialFen)
      level = l

      const bookPly = LVL_BOOK_PLY[level - 1], 
        bookMargin = LVL_BOOK_MARGIN[level - 1],
        moveTime = LVL_MOVETIMES[level - 1]
      let pst: number, handicap: number, depth: number, ply: number, nodes: number;
      if (initVariant === 'frysk') {
        pst = LVL_PST_FY[level - 1]
        handicap = LVL_HANDICAPS_FY[level - 1]
        depth = LVL_DEPTHS_FY[level - 1]
        ply = 0
        // frysk "opening book"
        if (initialFen === "Wbbbbbeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeewwwww" && moves.length < 4)
            nodes = 1
        else
            nodes = LVL_NODES_FY[level - 1]
      } else if (initVariant === 'frisian') {
        pst = LVL_PST[level - 1]
        handicap = LVL_HANDICAPS_FR[level - 1]
        depth = LVL_DEPTHS_FR[level - 1]
        ply = 0
        nodes = LVL_NODES_FR[level - 1]
      } else if (initVariant === 'antidraughts') {
        pst = LVL_PST_L[level - 1]
        handicap = LVL_HANDICAPS_L[level - 1]
        depth = LVL_DEPTHS_L[level - 1]
        ply = LVL_PLY_L[level - 1]
        nodes = LVL_NODES_L[level - 1]
      } else {
        pst = LVL_PST[level - 1]
        handicap = LVL_HANDICAPS[level - 1]
        depth = LVL_DEPTHS[level - 1]
        ply = 0
        nodes = LVL_NODES[level - 1]
      }
 
      const scanMoves = moves.map(m => {
        if (m.length > 4)
          return m.slice(0, 2) + 'x' + m.slice(2);
        else
          return m.slice(0, 2) + '-' + m.slice(2);
      });

      // TODO: Movetimes might need a different approach
      setOption('threads', getNbCores())
        .then(() => send('new-game'))
        .then(() => send('pos pos=' + initialFen + (scanMoves.length != 0 ? (' moves="' + scanMoves.join(' ') + '"') : '')))
        .then(() => handicap ? send(`level handicap=${handicap}`) : Promise.resolve())
        .then(() => ply ? send(`level ply=${ply}`) : Promise.resolve())
        .then(() => nodes ? send(`level nodes=${nodes}`) : Promise.resolve())
        .then(() => setOption('eval', pst ? 'pst' : 'pattern'))
        .then(() => bookMargin ? setOption('book-margin', bookMargin) : Promise.resolve())
        .then(() => setOption('book-ply', bookPly))
        .then(() => depth ? send(`level depth=${depth}`) : Promise.resolve())
        .then(() => moveTime ? send(`level move-time=${moveTime / 1000}`) : Promise.resolve())
        .then(() => send('go think'))
    },

    exit() {
      return Scan.exit()
    },

    variant() { 
      return initVariant
    }
  }
}

function onInit() {
  return send('hub')
    .then(() => send('init'))
}

/*function moveTime(level: number) {
  const maxMoveTime = 8000
  return level * maxMoveTime / 8
}*/
