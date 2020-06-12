import router from '../../router'
import * as helper from '../helper'
import { closeIcon } from '../shared/icons'
import i18n from '../../i18n'
import TournamentCtrl from './detail/TournamentCtrl'

export interface FaqCtrl {
  open: () => void
  close: (fromBB?: string) => void
  isOpen: () => boolean
  root: TournamentCtrl
}

export default {
  controller(root: TournamentCtrl): FaqCtrl {
    let isOpen = false

    function open() {
      router.backbutton.stack.push(close)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
    }

    return {
      open,
      close,
      isOpen() {
        return isOpen
      },
      root
    }
  },

  view: function(ctrl: FaqCtrl) {
    if (!ctrl.isOpen()) return null
    const tournament = ctrl.root.tournament

    if (!tournament) return null
    return (
      <div className="modal" id="tournamentFaqModal" oncreate={helper.slidesInUp}>
        <header>
          <button className="modal_close"
            oncreate={helper.ontap(helper.slidesOutDown(ctrl.close, 'tournamentFaqModal'))}
          >
            { closeIcon }
          </button>
          <h2>Tournament FAQ</h2>
        </header>
        <div className="modal_content">
          <div className="tournamentFaq">
            <h2>{i18n('isItRated')}</h2>
            {i18n('someRated')}

            <h2>{i18n('howAreScoresCalculated')}</h2>
            {i18n('howAreScoresCalculatedAnswer')}

            <h2>{i18n('berserk')}</h2>
            {i18n('berserkAnswer')}

            <h2>{i18n('howIsTheWinnerDecided')}</h2>
            {i18n('howIsTheWinnerDecidedAnswer')}

            <h2>{i18n('howDoesPairingWork')}</h2>
            {i18n('howDoesPairingWorkAnswer')}

            <h2>{i18n('howDoesItEnd')}</h2>
            {i18n('howDoesItEndAnswer')}

            <h2>{i18n('otherRules')}</h2>
            {i18n('thereIsACountdown')}
            {' ' + i18n('drawingWithinNbMoves', 10)}
          </div>
        </div>
      </div>
    )
  }
}
