import { Dialog } from '@capacitor/dialog'
import { Toast } from '@capacitor/toast'
import router from '../../router'
import storage from '../../storage'
import sound from '../../sound'
import vibrate from '../../vibrate'
import i18n from '../../i18n'
import redraw from '../../utils/redraw'
import { handleXhrError } from '../../utils'
import { positionsCache } from '../../utils/gamePosition'
import { emptyFen } from '../../utils/fen'
import { game as gameXhr } from '../../xhr'
import * as sleepUtils from '../../utils/sleep'
import { isOnlineGameData, OnlineGameData } from '../../lidraughts/interfaces/game'
import { ChallengeData } from '../../lidraughts/interfaces/challenge'
import * as gameApi from '../../lidraughts/game'
import { getVariant } from '../../lidraughts/variant'
import socket from '../../socket'
import * as helper from '../helper'
import roundView, { viewOnlyBoardContent } from '../shared/round/view/roundView'
import gamesMenu from '../gamesMenu'
import layout from '../layout'
import { connectingHeader, loadingBackbutton } from '../shared/common'
import OnlineRound from '../shared/round/OnlineRound'
import ChallengeCtrl from './ChallengeCtrl'
import challengeView from './challengeView'

interface Attrs {
  id: string
  color?: Color
  goingBack?: string
  ply?: string
}

interface State {
  round?: OnlineRound
  challenge?: ChallengeCtrl
}

export default {
  oninit(vnode) {
    sleepUtils.keepAwake()

    const now = performance.now()
    gameXhr(vnode.attrs.id, vnode.attrs.color)
    .then(data => {
      if (isChallengeData(data)) {
        vnode.state.challenge = new ChallengeCtrl(data)
        redraw()
      } else if (isOnlineGameData(data)) {
        loadRound(vnode, now, data)
      }
    })
    .catch(error => {
      handleXhrError(error)
      router.set('/')
    })
  },

  oncreate(vnode) {
    if (vnode.attrs.goingBack) {
      helper.pageSlideIn(vnode.dom as HTMLElement)
    } else {
      helper.elFadeIn(vnode.dom as HTMLElement)
    }
  },

  onremove() {
    sleepUtils.allowSleepAgain()
    socket.destroy()
    if (this.round) {
      this.round.unload()
    }
    if (this.challenge) {
      this.challenge.unload()
    }
  },

  view({ attrs }) {
    if (this.round) return roundView(this.round)
    if (this.challenge) return challengeView(this.challenge)

    const pov = gamesMenu.lastJoined()
    let board: Mithril.Child

    if (pov) {
      board = viewOnlyBoardContent(pov.fen, pov.color, pov.variant.key, pov.lastMove)
    } else {
      const g = positionsCache.get(attrs.id)
      if (g)
        board = viewOnlyBoardContent(g.fen, g.orientation, g.variant)
      else
        board = viewOnlyBoardContent(emptyFen, 'white', 'standard')
    }

    return layout.board(
      attrs.goingBack ? loadingBackbutton() : connectingHeader(),
      board
    )
  }
} as Mithril.Component<Attrs, State>

function loadRound(
  vnode: Mithril.Vnode<Attrs, State>,
  time: number,
  data: OnlineGameData
): void {
  if (!gameApi.isSupportedVariant(data)) {
    Toast.show({ text: i18n('unsupportedVariant', data.game.variant.name), position: 'center', duration: 'short' })
    router.set('/')
  }
  else {
    if (
      gameApi.isPlayerPlaying(data) &&
      gameApi.nbMoves(data, data.player.color) === 0
    ) {
      sound.dong()
      vibrate.quick()
      const variant = getVariant(data.game.variant.key)
      const storageKey = variantStorageKey(data.game.variant.key)
      if (
        variant.alert && [1, 3].indexOf(variant.id) === -1 &&
        !storage.get(storageKey)
      ) {
        Dialog.alert({
          title: 'Alert',
          message: variant.alert
        }).then(() => {
          storage.set(storageKey, true)
        })
      }
    }

    const elapsed = performance.now() - time

    setTimeout(() => {
      const plyCast = Number(vnode.attrs.ply)
      const ply = isNaN(plyCast) ? undefined : plyCast
      vnode.state.round = new OnlineRound(!!vnode.attrs.goingBack, vnode.attrs.id, data, false, undefined, undefined, ply)
    }, Math.max(400 - elapsed, 0))

    gamesMenu.resetLastJoined()

    if (data.player.user === undefined) {
      storage.set('lastPlayedGameURLAsAnon', data.url.round)
    }
  }
}

function isChallengeData(d: OnlineGameData | ChallengeData): d is ChallengeData {
  return (<ChallengeData>d).challenge !== undefined
}

function variantStorageKey(variant: string) {
  return 'game.variant.prompt.' + variant
}
