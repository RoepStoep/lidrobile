import h from 'mithril/hyperscript'
import socket from '../../socket'
import * as helper from '../helper'
import { getCurrentOTBGame } from '../../utils/offlineGames'
import * as sleepUtils from '../../utils/sleep'
import { playerFromFen, emptyFen } from '../../utils/fen'
import i18n from '../../i18n'
import layout from '../layout'
import { header as renderHeader } from '../shared/common'
import { viewOnlyBoardContent } from '../shared/round/view/roundView'
import GameTitle from '../shared/GameTitle'

import OtbRound from './OtbRound'
import { overlay, renderContent } from './otbView'

interface Attrs {
  fen?: string
  variant?: VariantKey
}

interface State {
  round?: OtbRound
}

export default {
  oninit({ attrs }) {
    socket.createDefault()

    getCurrentOTBGame().then(saved => {
      this.round = new OtbRound(saved, attrs.fen, attrs.variant)
      window.addEventListener('unload', this.round.saveClock)
    })

    sleepUtils.keepAwake()
  },
  oncreate: helper.viewFadeIn,
  onremove() {
    sleepUtils.allowSleepAgain()
    if (this.round) {
      this.round.unload()
      window.removeEventListener('unload', this.round.saveClock)
    }
  },
  view({ attrs }) {
    let content: Mithril.Children, header: Mithril.Children

    if (this.round && this.round.data && this.round.draughtsground) {
      header = renderHeader(h(GameTitle, { data: this.round.data }))
      content = renderContent(this.round)
    } else {
      const fen = attrs.fen || emptyFen
      const variant = attrs.variant || 'standard'
      const color = fen ? playerFromFen(fen) : 'white'
      header = renderHeader(i18n('playOfflineOverTheBoard'))
      content = viewOnlyBoardContent(fen, color, variant, undefined, undefined)
    }

    return layout.board(
      header,
      content,
      undefined,
      this.round && overlay(this.round),
      undefined,
      this.round && this.round.data && this.round.data.player.color || 'white'
    )
  }
} as Mithril.Component<Attrs, State>
