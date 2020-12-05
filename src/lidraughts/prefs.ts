export type PrefValue = number | string | boolean
export interface LidraughtsPropOption {
  label: string
  value: PrefValue
  labelArg?: string
}

const BooleanNumber = {
  NO: 0,
  YES: 1
}
export const BooleanNumberChoices: readonly LidraughtsPropOption[] = [
  makeOption(BooleanNumber.NO, 'no'),
  makeOption(BooleanNumber.YES, 'yes')
]

export const SubmitMove = {
  NEVER: 0,
  CORRESPONDENCE_ONLY: 4,
  CORRESPONDENCE_UNLIMITED: 1,
  ALWAYS: 2
}
export const SubmitMoveChoices: readonly LidraughtsPropOption[] = [
  makeOption(SubmitMove.NEVER, 'never'),
  makeOption(SubmitMove.CORRESPONDENCE_ONLY, 'inCorrespondenceGames'),
  makeOption(SubmitMove.CORRESPONDENCE_UNLIMITED, 'correspondenceAndUnlimited'),
  makeOption(SubmitMove.ALWAYS, 'always')
]

export const ConfirmResign = BooleanNumber
export const ConfirmResignChoices = BooleanNumberChoices

export const AutoThreefold = {
  NEVER: 1,
  TIME: 2,
  ALWAYS: 3
}
export const AutoThreefoldChoices: readonly LidraughtsPropOption[] = [
  makeOption(AutoThreefold.NEVER, 'never'),
  makeOption(AutoThreefold.ALWAYS, 'always'),
  makeOption(AutoThreefold.TIME, 'whenTimeRemainingLessThanThirtySeconds')
]

export const Takeback = {
  NEVER: 1,
  CASUAL: 2,
  ALWAYS: 3
}
export const TakebackChoices: readonly LidraughtsPropOption[] = [
  makeOption(Takeback.NEVER, 'never'),
  makeOption(Takeback.ALWAYS, 'always'),
  makeOption(Takeback.CASUAL, 'inCasualGamesOnly')
]

export const Animation = {
  NONE: 0,
  FAST: 1,
  NORMAL: 2,
  SLOW: 3
}
export const AnimationChoices: readonly LidraughtsPropOption[] = [
  makeOption(Animation.NONE, 'none'),
  makeOption(Animation.FAST, 'fast'),
  makeOption(Animation.NORMAL, 'normal'),
  makeOption(Animation.SLOW, 'slow')
]

export const Replay = {
  NEVER: 0,
  SLOW: 1,
  ALWAYS: 2
}
export const ReplayChoices: readonly LidraughtsPropOption[] = [
  makeOption(Replay.NEVER, 'never'),
  makeOption(Replay.SLOW, 'onSlowGames'),
  makeOption(Replay.ALWAYS, 'always')
]

export const ClockTenths = {
  NEVER: 0,
  LOWTIME: 1,
  ALWAYS: 2
}
export const ClockTenthsChoices: readonly LidraughtsPropOption[] = [
  makeOption(ClockTenths.NEVER, 'never'),
  makeOption(ClockTenths.LOWTIME, 'whenTimeRemainingLessThanTenSeconds'),
  makeOption(ClockTenths.ALWAYS, 'always')
]

export const MoreTime = {
  NEVER: 1,
  CASUAL: 2,
  ALWAYS: 3,
}
export const MoreTimeChoices: readonly LidraughtsPropOption[] = [
  makeOption(MoreTime.NEVER, 'never'),
  makeOption(MoreTime.ALWAYS, 'always'),
  makeOption(MoreTime.CASUAL, 'inCasualGamesOnly'),
]

export const Challenge = {
  NEVER: 1,
  RATING: 2,
  FRIEND: 3,
  ALWAYS: 4
}
export const ChallengeChoices: readonly LidraughtsPropOption[] = [
  makeOption(Challenge.NEVER, 'never'),
  makeOption(Challenge.RATING, 'ifRatingIsPlusMinusX', '500'),
  makeOption(Challenge.FRIEND, 'onlyFriends'),
  makeOption(Challenge.ALWAYS, 'always')
]

export const Message = {
  NEVER: 1,
  FRIEND: 2,
  ALWAYS: 3
}
export const MessageChoices: readonly LidraughtsPropOption[] = [
  makeOption(Message.NEVER, 'never'),
  makeOption(Message.FRIEND, 'onlyFriends'),
  makeOption(Message.ALWAYS, 'always')
]

function makeOption(value: PrefValue, label: string, labelArg?: string): LidraughtsPropOption {
  return {
    value,
    label,
    labelArg,
  }
}
