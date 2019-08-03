import { askWorker } from './utils/worker'
import { GameStatus, KingMoves } from './lidraughts/interfaces/game'
import { VariantKey, Variant } from './lidraughts/interfaces/variant'

const worker = new Worker('vendor/scaladraughts.js')

// warmup
worker.postMessage({ topic: 'init', payload: { variant: 'standard'}})

export interface GameSituation {
  readonly id: string
  readonly ply: number
  readonly variant: string
  readonly fen: string
  readonly player: Color
  readonly dests: DestsMap
  readonly drops?: ReadonlyArray<string>
  readonly captureLength?: number
  readonly end: boolean
  readonly playable: boolean
  readonly status?: GameStatus
  readonly winner?: Color
  readonly kingMoves?: KingMoves
  readonly san?: San
  readonly uci?: Uci
  readonly pdnMoves: ReadonlyArray<string>
  readonly uciMoves: ReadonlyArray<string>
  readonly promotion?: string
}

export interface InitRequest {
  readonly variant: VariantKey
  readonly fen?: string
}

export interface InitResponse {
  readonly variant: Variant
  readonly setup: GameSituation
}

export interface DestsRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly path?: string
}

export interface DestsResponse {
  readonly dests: DestsMap
  readonly path: string
}

export interface SituationRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly path?: string
}

export interface SituationResponse {
  readonly situation: GameSituation
  readonly path: string
}

export interface MoveRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly orig: Key
  readonly dest: Key
  readonly pdnMoves?: ReadonlyArray<string>
  readonly uciMoves?: ReadonlyArray<string>
  promotion?: Role
  readonly path?: string
}

export interface MoveResponse {
  readonly situation: GameSituation
  readonly path?: string
}

export interface DropRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly pos: Key
  readonly role: Role
  readonly pdnMoves?: ReadonlyArray<string>
  readonly uciMoves?: ReadonlyArray<string>
  readonly path?: string
}

export interface ThreefoldTestRequest {
  readonly variant: VariantKey
  readonly initialFen: string
  readonly pdnMoves: ReadonlyArray<string>
}

export interface ThreefoldTestResponse {
  readonly threefoldRepetition: boolean
  readonly status: GameStatus
}

export interface PdnDumpRequest {
  readonly variant: VariantKey
  readonly initialFen: string
  readonly pdnMoves: ReadonlyArray<string>
  readonly white?: string
  readonly black?: string
  readonly date?: string
}

export interface PdnDumpResponse {
  readonly pdn: string
}

export interface PdnReadRequest {
  readonly pdn: string
}

export interface PdnReadResponse {
  readonly variant: Variant
  readonly setup: GameSituation
  readonly replay: ReadonlyArray<GameSituation>
}

function uniqId() {
  return String(performance.now())
}

export function init(payload: InitRequest): Promise<InitResponse> {
  return askWorker(worker, { topic: 'init', payload })
}

export function dests(payload: DestsRequest): Promise<DestsResponse> {
  return askWorker(worker, { topic: 'dests', payload, reqid: uniqId() })
}

export function situation(payload: SituationRequest): Promise<SituationResponse> {
  return askWorker(worker, { topic: 'situation', payload, reqid: uniqId() })
}

export function move(payload: MoveRequest): Promise<MoveResponse> {
  return askWorker(worker, { topic: 'move', payload, reqid: uniqId() })
}

export function drop(payload: DropRequest): Promise<MoveResponse> {
  return askWorker(worker, { topic: 'drop', payload, reqid: uniqId() })
}

export function threefoldTest(payload: ThreefoldTestRequest): Promise<ThreefoldTestResponse> {
  return askWorker(worker, { topic: 'threefoldTest', payload })
}

export function pdnDump(payload: PdnDumpRequest): Promise<PdnDumpResponse> {
  return askWorker(worker, { topic: 'pdnDump', payload })
}

export function pdnRead(payload: PdnReadRequest): Promise<PdnReadResponse> {
  return askWorker(worker, { topic: 'pdnRead', payload })
}
