import * as h from 'mithril/hyperscript'
import socket from '../../socket'
import * as helper from '../helper'
import { getCurrentOTBGame } from '../../utils/offlineGames'
import * as sleepUtils from '../../utils/sleep'
import { playerFromFen } from '../../utils/fen'
import { standardFen } from '../../lidraughts/variant'
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
  round: OtbRound
}

const OtbScreen: Mithril.Component<Attrs, State> = {
  oninit({ attrs }) {
    socket.createDefault()

    const saved = getCurrentOTBGame()
    const setupFen = attrs.fen
    const setupVariant = attrs.variant

    this.round = new OtbRound(saved, setupFen, setupVariant)

    sleepUtils.keepAwake()
    document.addEventListener('pause', this.round.saveClock)
    window.addEventListener('unload', this.round.saveClock)
  },
  oncreate: helper.viewFadeIn,
  onremove() {
    sleepUtils.allowSleepAgain()
    document.removeEventListener('pause', this.round.saveClock)
    window.removeEventListener('unload', this.round.saveClock)
    this.round.saveClock()
  },
  view() {
    let content: Mithril.Children, header: Mithril.Children

    if (this.round.data && this.round.draughtsground) {
      header = renderHeader(h(GameTitle, { data: this.round.data }))
      content = renderContent(this.round)
    } else {
      const fen = this.round.vm.setupFen || this.round.vm.savedFen || standardFen
      const variant = this.round.vm.setupVariant || this.round.vm.savedVariant || 'standard'
      const color = fen ? playerFromFen(fen) : 'white'
      header = renderHeader(i18n('playOnTheBoardOffline'))
      content = viewOnlyBoardContent(fen, color, variant, undefined, undefined)
    }

    return layout.board(
      header,
      content,
      overlay(this.round),
      undefined,
      this.round.data && this.round.data.player.color || 'white'
    )
  }
}

export default OtbScreen
