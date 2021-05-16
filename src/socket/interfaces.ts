import { Friend } from '../lidraughts/friends'

export interface LidraughtsMessage<T> {
  t: string
  d?: T
}

export type LidraughtsMessageAny = LidraughtsMessage<unknown>

interface Options {
  name: string
  debug?: boolean
  pingDelay?: number
  sendOnOpen?: ReadonlyArray<LidraughtsMessageAny>
  registeredEvents: string[]
  isAuth?: boolean
}

export interface SocketConfig {
  options: Options
  params?: StringMap
}

type MessageHandler<D, P extends LidraughtsMessage<D>> = (data?: D, payload?: P) => void

type MessageHandlerGeneric = MessageHandler<any, any>

export interface SocketIFace {
  send: <D, O>(t: string, data?: D, opts?: O) => void
  ask: <R>(t: string, listenTo: string, data?: any, opts?: any) => Promise<R>
}

export interface MessageHandlers {
  [index: string]: MessageHandlerGeneric
}

export interface SocketHandlers {
  onOpen: () => void
  onError?: () => void
  events: MessageHandlers
}

export interface SocketSetup {
  clientId: string
  socketEndPoint: string
  url: string
  version?: number
  opts: SocketConfig
  keep?: boolean
}

export interface ConnectionSetup {
  setup: SocketSetup
  handlers: SocketHandlers
}

export interface FollowingEntersPayload extends LidraughtsMessage<Friend> {
  playing: boolean
  patron: boolean
}

export interface FollowingOnlinePayload extends LidraughtsMessage<string[]> {
  playing: string[]
  patrons: string[]
}
