import * as h from 'mithril/hyperscript'
import router from '../../router'
import i18n from '../../i18n'
import session from '../../session'
import * as draughts from '../../draughts'
import redraw from '../../utils/redraw'
import { handleXhrError  } from '../../utils'
import popupWidget from '../shared/popup'
import spinner from '../../spinner'
import * as gameApi from '../../lidraughts/game'
import { isOnlineAnalyseData } from '../../lidraughts/interfaces/analyse'
import { getPDN } from '../shared/round/roundXhr'
import * as helper from '../helper'

import AnalyseCtrl from './AnalyseCtrl'
import { toggleCoordinates } from '../../draughtsground/fen'

export interface IMainMenuCtrl {
  open: () => void
  close: () => void
  isOpen: () => boolean
  root: AnalyseCtrl
  s: {
    showShareMenu: boolean
    computingPDN: boolean
  }
}

export default {

  controller(root: AnalyseCtrl): IMainMenuCtrl {
    let isOpen = false

    function open() {
      router.backbutton.stack.push(close)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
      s.showShareMenu = false
    }

    const s = {
      showShareMenu: false,
      computingPDN: false
    }

    return {
      open,
      close,
      isOpen: () => isOpen,
      root,
      s
    }
  },

  view(ctrl: IMainMenuCtrl) {
    return popupWidget(
      'analyse_menu',
      undefined,
      () => ctrl.s.showShareMenu ? renderShareMenu(ctrl.root) : renderAnalyseMenu(ctrl.root),
      ctrl.isOpen(),
      ctrl.close
    )
  }
}

function renderAnalyseMenu(ctrl: AnalyseCtrl) {

  return h('div.analyseMenu', [
    h('button', {
      key: 'share',
      oncreate: helper.ontap(() => {
        ctrl.menu.s.showShareMenu = true
      })
    }, [h('span.fa.fa-share-alt'), i18n('shareAndExport')]),
    h('button[data-icon=B]', {
      key: 'flipBoard',
      oncreate: helper.ontap(ctrl.settings.flip)
    }, i18n('flipBoard')),
    ctrl.isOfflineOrNotPlayable() ? h('button[data-icon=U]', {
      key: 'continueFromHere',
      oncreate: helper.ontap(() => {
        ctrl.menu.close()
        ctrl.continuePopup.open(ctrl.node.fen, ctrl.data.game.variant.key, ctrl.data.player.color)
      })
    }, i18n('continueFromHere')) : null,
    ctrl.isOfflineOrNotPlayable() ? h('button', {
      key: 'boardEditor',
      oncreate: helper.ontap(() => router.set(`/editor/variant/${encodeURIComponent(ctrl.data.game.variant.key)}/fen/${encodeURIComponent(ctrl.node.fen)}`))
    }, [h('span.fa.fa-pencil'), i18n('boardEditor')]) : null,
    ctrl.data.analysis ? h('button', {
      key: 'retro',
      oncreate: helper.ontap(() => {
        ctrl.menu.close()
        ctrl.toggleRetro()
      }),
      disabled: !!ctrl.retro
    }, [h('span.fa.fa-play'), i18n('learnFromYourMistakes')]) : null,
    ctrl.notes ? h('button', {
      key: 'notes',
      oncreate: helper.ontap(() => {
        if (ctrl.notes) {
          ctrl.menu.close()
          ctrl.notes.open()
        }
      })
    }, [h('span.fa.fa-pencil'), i18n('notes')]) : null
  ])
}

function renderShareMenu(ctrl: AnalyseCtrl) {
  return h('div.analyseMenu', [
    isOnlineAnalyseData(ctrl.data) ? h('button', {
      oncreate: helper.ontap(() => {
        ctrl.menu.close()
        window.plugins.socialsharing.share(null, null, null, gameApi.publicAnalyseUrl(ctrl.data))
      })
    }, [i18n('shareGameURL')]) : null,
    ctrl.source === 'offline' ? h('button', {
      key: 'sharePDN',
      oncreate: helper.ontap(() => {
        offlinePdnExport(ctrl)
      }),
    }, ctrl.menu.s.computingPDN ? spinner.getVdom('monochrome') : [i18n('sharePDN')]) : null,
    ctrl.source === 'online' && !gameApi.playable(ctrl.data) ? h('button', {
      key: 'shareAnnotatedPDN',
      oncreate: helper.ontap(() => {
        onlinePDNExport(ctrl, false)
      }),
    }, ctrl.menu.s.computingPDN ? spinner.getVdom('monochrome') : 'Share annotated PDN') : null,
    ctrl.source === 'online' && !gameApi.playable(ctrl.data) ? h('button', {
      key: 'shareRawPDN',
      oncreate: helper.ontap(() => {
        onlinePDNExport(ctrl, true)
      }),
    }, ctrl.menu.s.computingPDN ? spinner.getVdom('monochrome') : 'Share raw PDN') : null,
    ctrl.isOfflineOrNotPlayable() ? h('button', {
      key: 'shareFEN',
      oncreate: helper.ontap(() => {
        ctrl.menu.close()
        window.plugins.socialsharing.share(toggleCoordinates(ctrl.node.fen, ctrl.isAlgebraic()))
      }),
    }, 'Share current FEN') : null,
  ])
}

function onlinePDNExport(ctrl: AnalyseCtrl, raw: boolean) {
  if (!ctrl.menu.s.computingPDN) {
    ctrl.menu.s.computingPDN = true
    getPDN(ctrl.data.game.id, ctrl.isAlgebraic(), raw)
    .then((pdn: string) => {
      ctrl.menu.s.computingPDN = false
      ctrl.menu.close()
      redraw()
      window.plugins.socialsharing.share(pdn)
    })
    .catch(e => {
      ctrl.menu.s.computingPDN = false
      redraw()
      handleXhrError(e)
    })
  }
}

function offlinePdnExport(ctrl: AnalyseCtrl) {
  if (!ctrl.menu.s.computingPDN) {
    ctrl.menu.s.computingPDN = true
    const endSituation = ctrl.tree.lastNode()
    const white = ctrl.data.player.color === 'white' ?
    (ctrl.data.game.id === 'offline_ai' ? session.appUser('Anonymous') : 'Anonymous') :
    (ctrl.data.game.id === 'offline_ai' ? ctrl.data.opponent.username : 'Anonymous')
    const black = ctrl.data.player.color === 'black' ?
    (ctrl.data.game.id === 'offline_ai' ? session.appUser('Anonymous') : 'Anonymous') :
    (ctrl.data.game.id === 'offline_ai' ? ctrl.data.opponent.username : 'Anonymous')
    draughts.pdnDump({
      variant: ctrl.data.game.variant.key,
      algebraic: ctrl.isAlgebraic(),
      initialFen: ctrl.data.game.initialFen,
      pdnMoves: endSituation.pdnMoves || [],
      finalSquare: true,
      white,
      black
    })
    .then((res: draughts.PdnDumpResponse) => {
      ctrl.menu.s.computingPDN = false
      ctrl.menu.close()
      redraw()
      window.plugins.socialsharing.share(res.pdn)
    })
    .catch(e => {
      ctrl.menu.s.computingPDN = false
      redraw()
      console.error(e)
    })
  }
}
