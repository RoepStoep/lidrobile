import Stream from 'mithril/stream'
import { Challenge } from '../../lidraughts/interfaces/challenge'

export interface ChallengeState {
  pingTimeoutId: number
  challenge: Stream<Challenge | undefined>
  joinChallenge(): Promise<void>
  declineChallenge(): Promise<void>
  cancelChallenge(): Promise<void>
}
