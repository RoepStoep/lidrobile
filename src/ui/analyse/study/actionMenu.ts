import * as h from 'mithril/hyperscript'
import router from '../../../router'
import redraw from '../../../utils/redraw'
import { ErrorResponse } from '../../../http'
import { handleXhrError  } from '../../../utils'
import i18n from '../../../i18n'
import popupWidget from '../../shared/popup'
import spinner from '../../../spinner'
import * as helper from '../../helper'
import { studyPDN, studyChapterPDN } from '../../study/studyXhr'
import startTour from './tour'

import AnalyseCtrl from '../AnalyseCtrl'

export interface IActionMenuCtrl {
  open: () => void
  close: () => void
  isOpen: () => boolean
  root: AnalyseCtrl
  s: {
    showShareMenu: boolean
    loadingStudyPDN: boolean
    loadingChapterPDN: boolean
  }
}

export default {

  controller(root: AnalyseCtrl): IActionMenuCtrl {
    let isOpen = false

    const s = {
      showShareMenu: false,
      loadingStudyPDN: false,
      loadingChapterPDN: false,
    }

    function open() {
      router.backbutton.stack.push(close)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
      s.showShareMenu = false
    }

    return {
      open,
      close,
      isOpen: () => isOpen,
      root,
      s
    }
  },

  view(ctrl: IActionMenuCtrl) {
    return popupWidget(
      'analyse_menu',
      undefined,
      () => ctrl.s.showShareMenu ? renderShareMenu(ctrl.root) : renderStudyMenu(ctrl.root),
      ctrl.isOpen(),
      ctrl.close
    )
  }
}

const baseUrl = 'https://lidraughts.org/'

function renderStudyMenu(ctrl: AnalyseCtrl) {

  return h('div.analyseMenu', [
    h('button', {
      key: 'share',
      oncreate: helper.ontap(() => {
        ctrl.study!.actionMenu.s.showShareMenu = true
      })
    }, [h('span.fa.fa-share'), i18n('share')]),
    h('button', {
      key: 'like',
      oncreate: helper.ontap(ctrl.study!.toggleLike)
    }, [
      h.trust('&nbsp;'),
      h('span.fa', {
        className: ctrl.study!.data.liked ? 'fa-heart' : 'fa-heart-o'
      }),
      `Like (${ctrl.study!.data.likes})`
    ]),
     h('button[data-icon=U]', {
      key: 'continueFromHere',
      oncreate: helper.ontap(() => {
        ctrl.menu.close()
        ctrl.continuePopup.open(ctrl.node.fen, ctrl.data.game.variant.key, ctrl.data.player.color)
      })
    }, i18n('continueFromHere')),
    h('button', {
      key: 'boardEditor',
      oncreate: helper.ontap(() => router.set(`/editor/variant/${encodeURIComponent(ctrl.data.game.variant.key)}/fen/${encodeURIComponent(ctrl.node.fen)}`))
    }, [h('span.fa.fa-pencil'), i18n('boardEditor')]),
    h('button', {
      key: 'help',
      oncreate: helper.ontap(() => {
        ctrl.study!.actionMenu.close()
        startTour(ctrl.study!)
      }),
    }, [
    h('span.fa.fa-question-circle'),
    'Help'
    ]),
  ])
}

function renderShareMenu(ctrl: AnalyseCtrl) {

  function onPdnSuccess(pdn: string) {
    ctrl.study!.actionMenu.s.loadingChapterPDN = false
    ctrl.study!.actionMenu.s.loadingStudyPDN = false
    redraw()
    window.plugins.socialsharing.share(pdn)
  }

  function onPdnError(e: ErrorResponse) {
    ctrl.study!.actionMenu.s.loadingChapterPDN = false
    ctrl.study!.actionMenu.s.loadingStudyPDN = false
    redraw()
    handleXhrError(e)
  }

  return h('div.analyseMenu', [
    h('button', {
      oncreate: helper.ontap(() => {
        const url = baseUrl + `study/${ctrl.study!.data.id}`
        window.plugins.socialsharing.share(null, null, null, url)
      })
    }, [i18n('Study URL')]),
    h('button', {
      oncreate: helper.ontap(() => {
        const url = baseUrl + `study/${ctrl.study!.data.id}/${ctrl.study!.data.chapter.id}`
        window.plugins.socialsharing.share(null, null, null, url)
      })
    }, [i18n('Current chapter URL')]),
    h('button', {
      oncreate: helper.ontap(() => {
        ctrl.study!.actionMenu.s.loadingStudyPDN = true
        studyPDN(ctrl.study!.data.id)
        .then(onPdnSuccess)
        .catch(onPdnError)
      })
    }, ctrl.study!.actionMenu.s.loadingStudyPDN ? spinner.getVdom('monochrome') : [i18n('Study PDN')]),
    h('button', {
      oncreate: helper.ontap(() => {
        ctrl.study!.actionMenu.s.loadingChapterPDN = true
        studyChapterPDN(ctrl.study!.data.id, ctrl.study!.data.chapter.id)
        .then(onPdnSuccess)
        .catch(onPdnError)
      })
    }, ctrl.study!.actionMenu.s.loadingChapterPDN ? spinner.getVdom('monochrome') : [i18n('Chapter PDN')]),
  ])
}
