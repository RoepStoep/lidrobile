import h from 'mithril/hyperscript'
import { Clipboard } from '@capacitor/clipboard'
import { Share } from '@capacitor/share'
import { Toast } from '@capacitor/toast'
import router from '../../router'
import session from '../../session'
import loginModal from '../loginModal'
import spinner from '../../spinner'
import { standardFen } from '../../lidraughts/variant'
import challengesApi from '../../lidraughts/challenges'
import { Challenge, ChallengeUser } from '../../lidraughts/interfaces/challenge'
import * as helper from '../helper'
import popupWidget from '../shared/popup'
import i18n from '../../i18n'
import layout from '../layout'
import { viewOnlyBoardContent } from '../shared/round/view/roundView'
import { header as headerWidget } from '../shared/common'
import ChallengeCtrl from './ChallengeCtrl'

export default function challengeView(ctrl: ChallengeCtrl) {
  let overlay: Mithril.Children | undefined = undefined
  let board = viewOnlyBoardContent(standardFen, 'white', 'standard')

  const challenge = ctrl.challenge

  const header = headerWidget('lidraughts.org')

  if (challenge) {
    board = viewOnlyBoardContent(
      challenge.initialFen || standardFen,
      'white', challenge.variant.key
    )

    if (challenge.direction === 'in') {
      overlay = joinPopup(ctrl, challenge)
    } else if (challenge.direction === 'out') {
      if (challenge.destUser) {
        overlay = awaitChallengePopup(ctrl, challenge)
      } else {
        overlay = awaitInvitePopup(ctrl, challenge)
      }
    }
  }

  return layout.board(header, board, 'challenge', overlay)
}

function publicUrl(challenge: Challenge) {
  return 'https://lidraughts.org/' + challenge.id
}

function gameInfos(challenge: Challenge) {
  const mode = challenge.rated ? i18n('rated') : i18n('casual')
  const time = challengesApi.challengeTime(challenge)
  return (
    <div className="gameInfos">
      <span data-icon="p">{time}</span> • <span>{challenge.variant.name}</span> • <span>{mode}</span>
    </div>
  )
}

function joinPopup(ctrl: ChallengeCtrl, challenge: Challenge) {
  let joinDom: Mithril.Child
  if (challenge.rated && !session.isConnected()) {
    joinDom = h('div.error', [
      i18n('thisGameIsRated'), h('br'), h('br'), i18n('youNeedAnAccountToDoThat'),
      h('div.go_or_cancel', [
        h('button.binary_choice[data-icon=E].withIcon', {
          oncreate: helper.ontap(loginModal.open)
        }, i18n('signIn')),
        h('button.binary_choice[data-icon=L].withIcon', {
          oncreate: helper.ontap(router.backHistory)
        }, i18n('cancel'))
      ])
    ])
  } else if (session.isConnected()) {
    joinDom = h('div.go_or_cancel', [
      h('button.binary_choice[data-icon=E].withIcon', {
          oncreate: helper.ontap(ctrl.joinChallenge)
      }, i18n('join')),
      h('button.binary_choice[data-icon=L].withIcon', {
        oncreate: helper.ontap(ctrl.declineChallenge)
      }, i18n('decline'))
    ])
  } else {
    joinDom = h('div', [
      h('button[data-icon=E].withIcon', {
          oncreate: helper.ontap(ctrl.joinChallenge)
      }, i18n('join'))
    ])
  }

  const challenger = challenge.challenger ?
    i18n('playerisInvitingYou', challengeUserFormat(challenge.challenger)) :
    i18n('playerisInvitingYou', i18n('anonymous'))

  return popupWidget(
    'join_url_challenge',
    undefined,
    function() {
      return h('div.infos', [
        h('div.challenger', challenger),
        h('br'),
        gameInfos(challenge),
        h('br'),
        joinDom
      ])
    },
    true
  )
}

function awaitInvitePopup(ctrl: ChallengeCtrl, challenge: Challenge) {

  const isPersistent = challengesApi.isPersistent(challenge)

  return popupWidget(
    'await_url_challenge',
    undefined,
    function() {
      return h('div.infos', [
        gameInfos(challenge),
        h('br'),
        h('p.explanation', i18n('toInviteSomeoneToPlayGiveThisUrl')),
        h('div.copy_container', [
          h('div.icon_container', [
            h('span.fa.fa-clipboard')
          ]),
          h('input.lidraughts_game_url', {
            oncreate: helper.ontap(function() {
              Clipboard.write({url: publicUrl(challenge)})
              Toast.show({ text: 'Copied to clipboard', position: 'center', duration: 'short'})
            }),
            value: publicUrl(challenge),
            readonly: true
          })
        ]),
        h('p.explanation.small', i18n('theFirstPersonToComeOnThisUrlWillPlayWithYou')),
        h('div.go_or_cancel.clearfix', [
          h('button.binary_choice[data-icon=E].withIcon', {
            oncreate: helper.ontap(function() {
              Share.share({ url: publicUrl(challenge) })
            })
          }, i18n('shareGameURL')),
          h('button.binary_choice[data-icon=L].withIcon', {
            oncreate: helper.ontap(ctrl.cancelChallenge)
          }, i18n('cancel'))
        ]),
        isPersistent ? h('div', [
          h('br'),
          h('button', {
            oncreate: helper.ontap(() => router.set('/'))
          }, [h('span.fa.fa-home'), i18n('returnToHome')])
        ]) : null
      ])
    },
    true
  )
}

function challengeUserFormat(user: ChallengeUser) {
  const ratingString = user.rating + (user.provisional ? '?' : '')
  return `${user.name} (${ratingString})`
}

function awaitChallengePopup(ctrl: ChallengeCtrl, challenge: Challenge) {

  // destUser is there in await challenge
  // todo: discriminate in types
  function popupContent() {
    return h('div.infos', [
      h('div', i18n('waitingForOpponent')),
      h('br'),
      h('div.user', challengeUserFormat(challenge.destUser!)),
      gameInfos(challenge),
      h('br'),
      spinner.getVdom(),
      h('br'),
      h('br'),
      h('button.withIcon[data-icon=L]', {
        oncreate: helper.ontap(ctrl.cancelChallenge)
      }, i18n('cancel')),
      challengesApi.isPersistent(challenge) ? h('div', [
        h('br'),
        h('button', {
          oncreate: helper.ontap(() => router.set('/'))
        }, [h('span.fa.fa-home'), i18n('returnToHome')])
      ]) : null
    ])
  }

  return popupWidget('await_url_challenge', undefined, popupContent, true)
}
