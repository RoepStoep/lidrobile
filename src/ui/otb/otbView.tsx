import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import * as utils from '../../utils'
import i18n from '../../i18n'
import Board from '../shared/Board'
import {
  renderAntagonist,
  renderReplay,
  renderInlineReplay,
  renderBackwardButton,
  renderForwardButton,
} from '../shared/offlineRound/view'
import * as helper from '../helper'
import actions from './actions'
import newGameMenu from './newOtbGame'
import importGamePopup from './importGamePopup'
import settings from '../../settings'
import OtbRound from './OtbRound'

export function overlay(ctrl: OtbRound) {
  return [
    actions.view(ctrl.actions),
    newGameMenu.view(ctrl.newGameMenu),
    importGamePopup.view(ctrl.importGamePopup)
  ]
}

export function renderContent(ctrl: OtbRound, pieceTheme?: string) {
  const flip = settings.otb.flipPieces()
  const mirror = settings.otb.mirrorPieces()
  const wrapperClasses = helper.classSet({
    'otb': true,
    'mode_flip': flip,
    'mode_facing': !flip && mirror,
    'turn_white': ctrl.draughtsground.state.turnColor === 'white',
    'turn_black': ctrl.draughtsground.state.turnColor === 'black'
  })
  const material = ctrl.draughtsground.getMaterialDiff()
  const playerName = i18n(ctrl.data.player.color)
  const opponentName = i18n(ctrl.data.opponent.color)
  const replayTable = renderReplay(ctrl)
  const isPortrait = helper.isPortrait()
  const vd = helper.viewportDim()

  const board = h(Board, {
    variant: ctrl.data.game.variant.key,
    draughtsground: ctrl.draughtsground,
    wrapperClasses,
    customPieceTheme: pieceTheme
  })

  const clock = ctrl.clock

  if (isPortrait)
    return [
      helper.hasSpaceForInlineReplay(vd, isPortrait) ? renderInlineReplay(ctrl) : null,
      renderAntagonist(ctrl, opponentName, material[ctrl.data.opponent.color], 'opponent', flip, mirror, clock),
      board,
      renderAntagonist(ctrl, playerName, material[ctrl.data.player.color], 'player', flip, mirror, clock),
      renderGameActionsBar(ctrl)
    ]
  else
    return [
      board,
      <section className="table">
        {renderAntagonist(ctrl, opponentName, material[ctrl.data.opponent.color], 'opponent', flip, mirror, clock)}
        {replayTable}
        {renderGameActionsBar(ctrl)}
        {renderAntagonist(ctrl, playerName, material[ctrl.data.player.color], 'player', flip, mirror, clock)}
      </section>
    ]
}

function renderGameActionsBar(ctrl: OtbRound) {
  return (
    <section className="actions_bar">
      <button className="action_bar_button fa fa-ellipsis-v"
        oncreate={helper.ontap(ctrl.actions.open)}
      />
      <button className="action_bar_button fa fa-plus-circle"
        oncreate={helper.ontap(
          () => { ctrl.saveClock(); ctrl.newGameMenu.open() },
          () => Toast.show({ text: i18n('createAGame'), duration: 'short', position: 'bottom' })
        )}
      />
      <button className="fa fa-share-alt action_bar_button"
        oncreate={helper.ontap(
          ctrl.sharePDN,
          () => Toast.show({ text: i18n('sharePDN'), duration: 'short', position: 'bottom' })
        )}
      />
      {ctrl.clock ?
        <button className={'fa action_bar_button ' + (ctrl.clock.isRunning() ? 'fa-pause' : 'fa-play') + (ctrl.isClockEnabled() ? '' : ' disabled')}
          oncreate={helper.ontap(
            ctrl.toggleClockPlay,
            () => Toast.show({ text: i18n('draughtsClock'), duration: 'short', position: 'bottom' })
          )}
        />
        : null
      }
      {utils.hasNetwork() ?
        <button className="fa fa-cloud-upload action_bar_button"
          oncreate={helper.ontap(
            ctrl.importGamePopup.open,
            () => Toast.show({ text: i18n('importGameOnLidraughts'), duration: 'short', position: 'bottom' })
          )}
        /> : null
      }
      {renderBackwardButton(ctrl)}
      {renderForwardButton(ctrl)}
    </section>
  )
}
