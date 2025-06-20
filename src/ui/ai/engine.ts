import { Capacitor } from '@capacitor/core'
import { AiRoundInterface } from '../shared/round'
import { ScanPlugin, getNbCores, getMaxMemory, parsePV, scanFen } from '../../scan'
import { readKingMoves } from '../../draughtsground/fen'

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

export default class Engine {
  private uciCache: any = {}
  private searchFen = ''
  private scan: ScanPlugin
  private isInit = false
  private listener: (e: Event) => void

  public readonly variant: VariantKey

  constructor(readonly ctrl: AiRoundInterface, readonly v: VariantKey) {
    this.listener = (e: Event) => {
      const line = (e as any).output
      console.debug('[scan >>] ' + line)
      const bmMatch = line.match(/^done move=([0-9\-xX\s]+)/)
      if (bmMatch) {
        this.ctrl.onEngineMove(parsePV(this.searchFen, bmMatch[1], v === 'frisian' || v === 'frysk', this.uciCache)[0])
      }
    }
    this.variant = v
    this.scan = new ScanPlugin(v, 16)
  }

  public async init(): Promise<void> {
    try {
      if (!this.isInit) {
        if (Capacitor.getPlatform() !== 'web') {
          const mem = await getMaxMemory()
          this.scan.setHash(mem)
        }
        await this.scan.start()
        this.isInit = true 
        window.addEventListener('scan', this.listener, { passive: true })
        await this.scan.setOption('threads', getNbCores())
        await this.newGame()
      }
    } catch (e) {
      console.error(e)
    }
  }

  public async newGame(): Promise<void> {
    await this.scan.send('new-game')
    await this.scan.isReady()
  }

  public async search(level: number, initialFen: string, currentFen: string, moves: string[]): Promise<void> {
    this.searchFen = currentFen
    
    const fen = scanFen(initialFen)
    const l = level

    const bookPly = LVL_BOOK_PLY[l - 1], 
      bookMargin = LVL_BOOK_MARGIN[l - 1],
      moveTime = LVL_MOVETIMES[l - 1]
    let pst: number, handicap: number, depth: number, ply: number, nodes: number
    if (this.variant === 'frysk') {
      pst = LVL_PST_FY[l - 1]
      handicap = LVL_HANDICAPS_FY[l - 1]
      depth = LVL_DEPTHS_FY[l - 1]
      ply = 0
      // frysk "opening book"
      if (fen === 'Wbbbbbeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeewwwww' && moves.length < 4)
          nodes = 1
      else
          nodes = LVL_NODES_FY[l - 1]
    } else if (this.variant === 'frisian') {
      pst = LVL_PST[l - 1]
      handicap = LVL_HANDICAPS_FR[l - 1]
      depth = LVL_DEPTHS_FR[l - 1]
      ply = 0
      nodes = LVL_NODES_FR[l - 1]
    } else if (this.variant === 'antidraughts') {
      pst = LVL_PST_L[l - 1]
      handicap = LVL_HANDICAPS_L[l - 1]
      depth = LVL_DEPTHS_L[l - 1]
      ply = LVL_PLY_L[l - 1]
      nodes = LVL_NODES_L[l - 1]
    } else {
      pst = LVL_PST[l - 1]
      handicap = LVL_HANDICAPS[l - 1]
      depth = LVL_DEPTHS[l - 1]
      ply = 0
      nodes = LVL_NODES[l - 1]
    }

    const scanMoves = moves.map(m => {
      if (m.length > 4)
        return m.slice(0, 2) + 'x' + m.slice(2)
      else
        return m.slice(0, 2) + '-' + m.slice(2)
    })

    let command = `pos pos=${fen}${scanMoves.length ? (' moves="' + scanMoves.join(' ') + '"') : ''}`

    if (this.variant === 'frysk' || this.variant === 'frisian') {
      const kingMoves = readKingMoves(initialFen)
      let wolf = ''
      if (kingMoves?.white.key && kingMoves?.white.count) {
        wolf += `W${kingMoves.white.key}=${kingMoves.white.count}`
      }
      if (kingMoves?.black.key && kingMoves?.black.count) {
        if (wolf) wolf += ' '
        wolf += `B${kingMoves.black.key}=${kingMoves.black.count}`
      }
      if (wolf) {
        command += ` wolf="${wolf}"`
      }
    }

    // TODO: Movetimes might need a different approach
    return this.scan.send(command)
      .then(() => handicap ? this.scan.send(`level handicap=${handicap}`) : Promise.resolve())
      .then(() => ply ? this.scan.send(`level ply=${ply}`) : Promise.resolve())
      .then(() => nodes ? this.scan.send(`level nodes=${nodes}`) : Promise.resolve())
      .then(() => this.scan.setOption('eval', pst ? 'pst' : 'pattern'))
      .then(() => bookMargin ? this.scan.setOption('book-margin', bookMargin) : Promise.resolve())
      .then(() => this.scan.setOption('book-ply', bookPly))
      .then(() => depth ? this.scan.send(`level depth=${depth}`) : Promise.resolve())
      .then(() => moveTime ? this.scan.send(`level move-time=${moveTime / 1000}`) : Promise.resolve())
      .then(() => this.scan.send('go think'))
  }

  public async exit(): Promise<void> {
    window.removeEventListener('scan', this.listener, false)
    return this.scan.exit()
  }

}
