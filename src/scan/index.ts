import { registerPlugin } from '@capacitor/core'
import { ScanPlugin as IScanPlugin } from 'capacitor-scan'
import { VariantKey } from '../lidraughts/interfaces/variant'

const NAME_REGEX = new RegExp(/^id\sname=([\w]+)\sversion=([\w.]+)/.source)

export const Scan = registerPlugin<IScanPlugin>('Scan', {
  web: () => import('./ScanWeb').then(m => new m.ScanWeb()),
})

export class ScanPlugin {
  private readonly plugin: IScanPlugin
  private ttSize: number

  constructor(readonly variant: VariantKey, hash: number) {
    this.ttSize = ttSize(hash)
    this.plugin = Scan
  }

  public async start(): Promise<{ engineName: string }> {
    // another call to init is required for changing variant, bb-size, tt-size
    return new Promise((resolve) => {
      let engineName = 'Scan'
      const listener = (e: Event) => {
        const line = (e as any).output
        if (typeof(line) !== 'string') return
        const matches = NAME_REGEX.exec(line)
        if (matches) {
          engineName = `${matches[1]} ${matches[2]}`
        }
        if (line.startsWith('ready')) {
          window.removeEventListener('scan', listener, false)
          resolve({ engineName })
        }
      }
      window.addEventListener('scan', listener, { passive: true })

      const scanVariant = parseVariant(this.variant)
      this.plugin.start({ variant: scanVariant })
        .then(() => this.setOption('tt-size', this.ttSize))
        .then(() => this.setOption('bb-size', bbSize(scanVariant)))
        .then(() => this.send('hub'))
        .then(() => this.send('init'))
    })
  }

  public setHash(hash: number): void {
    this.ttSize = ttSize(hash)
  }

  public isReady(): Promise<void> {
    return new Promise((resolve) => {
      const listener = (e: Event) => {
        const line = (e as any).output
        if (line.startsWith('pong')) {
          window.removeEventListener('scan', listener, false)
          resolve()
        }
      }
      window.addEventListener('scan', listener, { passive: true })
      this.send('ping')
    })
  }

  public send(text: string): Promise<void> {
    console.debug('[scan <<] ' + text)
    return this.plugin.cmd({ cmd: text })
  }

  public setOption(name: string, value: string | number | boolean): Promise<void> {
    return this.send(`set-param name=${name} value=${value}`)
  }

  public exit(): Promise<void> {
    return this.plugin.exit()
  }

}

/* 
 * tt-size: 
 *   The number of entries in the transposition table will be 2 ^ tt-size. 
 *   Every time you increase it by one, the size of the table will double.
 *   Every entry takes 16 bytes so tt-size = 26 corresponds to 1 GiB; Use smaller values for fast games. 
 */
function ttSize(hash: number) {
  return Math.floor(Math.log2((hash * 1024 * 1024) / 16))
}

function bbSize(scanVariant: string) {
  switch (scanVariant) {
    case 'normal':
    case 'frisian':
    case 'losing':
      return 3
    case 'bt':
      return 4
    default:
      return 0
  }
}

export function scanPieces(fen: string): string[] {
  const pieces: string[] = new Array<string>(50)
  const fenParts: string[] = fen.split(':')
  for (let i = 0; i < fenParts.length; i++) {
    if (fenParts[i].length > 1) {
      const color = fenParts[i].slice(0, 1)
      if (color === 'W' || color === 'B') {
        const fenPieces: string[] = fenParts[i].slice(1).split(',')
        for (let k = 0; k < fenPieces.length; k++) {
          const p = fenPieces[k].slice(0, 1)
          if (p === 'K') {
            pieces[parseInt(fenPieces[k].slice(1)) - 1] = color
          } else if (p !== 'G' && p !== 'P') {
            pieces[parseInt(fenPieces[k]) - 1] = color.toLowerCase()
          }
        }
      }
    }
  }
  return pieces
}

export function scanFen(fen: string): string {
  let result = fen.slice(0, 1)
  const pieces = scanPieces(fen)
  for (let i = 0; i < pieces.length; i++)
    result += pieces[i] !== undefined ? pieces[i] : 'e'
  return result
}

export function parseVariant(variant: VariantKey): string {
  const result = variant.toLowerCase()
  if (result === 'standard' || result === 'fromposition')
    return 'normal'
  else if (result === 'breakthrough')
    return 'bt'
  else if (result === 'antidraughts')
    return 'losing'
  else if (result === 'frysk')
    return 'frisian'
  return result
}

const fieldXMap = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]
const fieldYMap = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10]

export function parsePV(fen: string, pv: string, frisian: boolean, uciCache: any): string[] {
  const pieceArray = scanPieces(fen)

  const walkLine = (pieces: string[], king: boolean, srcF: number, dstF: number, forbiddenDsts?: number[], eyesF?: number, eyesStraight?: boolean): number | undefined => {
    const srcY = fieldYMap[srcF], srcX = fieldXMap[srcF]
    const dstY = fieldYMap[dstF], dstX = fieldXMap[dstF]
    const up = dstY > srcY
    const right = dstX > srcX || (dstX === srcX && srcY % 2 === 0)
    const vertical = frisian && dstY !== srcY && dstX === srcX && Math.abs(dstY - srcY) % 2 === 0
    const horizontal = frisian && dstX !== srcX && dstY === srcY
    let walker = eyesF ? dstF : srcF, steps = 0, touchedDst = false
    while ((king || steps < 1) && (steps === 0 || eyesF !== undefined || (walker !== dstF && !touchedDst))) {

      const walkerY = fieldYMap[walker]
      if (up) {
        walker += 5
        if (vertical) walker += 5
        else if (right) walker += walkerY % 2 === 1 ? 1 : 0
        else walker += walkerY % 2 === 0 ? -1 : 0
      } else if (horizontal) {
        if (right) {
          if (fieldXMap[walker] < 5) walker += 1
          else return undefined
        } else {
          if (fieldXMap[walker] > 1) walker -= 1
          else return undefined
        }
      } else {
        walker -= 5
        if (vertical) walker -= 5
        else if (right) walker += walkerY % 2 === 1 ? 1 : 0
        else walker += walkerY % 2 === 0 ? -1 : 0
      }

      if (walker < 0 || walker > 49) return undefined
      if (!(horizontal || vertical) && Math.abs(fieldYMap[walker] - walkerY) !== 1) return undefined
      if (pieces[walker]) {
        if (walker !== dstF)
          return undefined
        if (eyesF === undefined)
          touchedDst = true
        steps = 0
      } else {
        steps++
      }

      if (eyesF !== undefined) {
        if (eyesStraight) {
          if (eyesF === walker) return walker // eyesStraight: destination square only in current capture direction
        } else if ((!forbiddenDsts || forbiddenDsts.indexOf(walker) === -1) && walkLine(pieces, king, walker, eyesF) !== undefined) {
          return walker // !eyesStraight: current capture direction or perpendicular
        }
      }
    }
    return (walker === dstF || touchedDst) ? srcF : undefined
  }

  const tryCaptures = (pieces: string[], capts: number[], cur: number, dest: number): number[] => {
    const p = pieces[cur], king = (p === 'W' || p === 'B')
    for (let i = 0; i < capts.length; i++) {
      const capt = capts[i]
      if (walkLine(pieces, king, cur, capt) !== undefined) {
        for (let k = 0; k < capts.length; k++) {
          const captNext = i !== k ? capts[k] : (capts.length === 1 ? dest : -1)
          if (captNext !== -1) {
            const pivots: number[] = []
            let pivot: number | undefined
            do
            {
              pivot = walkLine(pieces, king, cur, capt, pivots, captNext, i === k && capts.length === 1)
              if (pivot !== undefined) {
                const newCapts = capts.slice()
                newCapts.splice(i, 1)
                const newPieces = pieces.slice()
                newPieces[capt] = 'x'
                newPieces[pivot] = p
                newPieces[cur] = ''
                const sequence = [pivot].concat(tryCaptures(newPieces, newCapts, pivot, dest))
                if (sequence.length === capts.length) return sequence
                pivots.push(pivot)
              }
            } while (pivot !== undefined)
          }
        }
      }
    }
    return []
  }

  let moveNr = 0
  return pv.split(' ').map(m => {
    moveNr++
    const takes = m.indexOf('x')
    if (takes !== -1) {
      const cached = uciCache[fen + moveNr + m]
      if (cached) return cached as string
      const fields = m.split('x').map(f => parseInt(f) - 1)
      const orig = fields[0], dest = fields[1]
      let uci: string[] = [(orig + 1).toString()]
      if (fields.length > 3 && moveNr === 1) { // full uci information is only relevant for the first move
        //captures can appear in any order, so try until we find a line that captures everything
        const sequence = tryCaptures(pieceArray, fields.slice(2), orig, dest)
        if (sequence) uci = uci.concat(sequence.map(m => (m + 1).toString()))
      } else uci.push((dest + 1).toString())
      const result = uci.join('x')
      uciCache[fen + moveNr + m] = result
      return result
    } else return m
  })
}

export async function getMaxMemory(): Promise<number> {
  return Promise.resolve(window.deviceInfo.scanMaxMemory)
}

export function getNbCores(): number {
  const cores = window.deviceInfo.cpuCores
  // NOTE: Scan knps actually decreases beyond 4 cores
  return Math.min(cores > 2 ? cores - 1 : 1, 4)
}
