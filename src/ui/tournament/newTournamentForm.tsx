import h from 'mithril/hyperscript'
import settings from '../../settings'
import i18n from '../../i18n'
import router from '../../router'
import * as utils from '../../utils'
import tupleOf from '../../utils/tupleOf'
import { standardFen } from '../../lidraughts/variant'
import { TournamentCreateResponse } from '../../lidraughts/interfaces/tournament'
import popupWidget from '../shared/popup'
import formWidgets from '../shared/form'
import TournamentsListCtrl from './TournamentsListCtrl'
import * as xhr from './tournamentXhr'

let isOpen = false

export default {
  open,
  close,
  view(ctrl: TournamentsListCtrl) {
    return popupWidget(
      'tournament_form_popup',
      undefined,
      () => renderForm(ctrl),
      isOpen,
      close
    )
  }
}

function open() {
  router.backbutton.stack.push(close)
  isOpen = true
}

function close(fromBB?: string) {
  if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
  isOpen = false
}


function renderForm(ctrl: TournamentsListCtrl) {
  return (
    <form id="tournamentCreateForm" class="tournamentForm"
    onsubmit={(e: Event) => {
      e.preventDefault()
      return create(e.target as HTMLFormElement)
    }}>
      <fieldset>
        <div className="select_input no_arrow_after">
          <div className="text_input_container">
            <label>{i18n('name')}</label>
            <input type="text"
              id="name"
              className="textField"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck={false}
            />
            Arena
          </div>
        </div>
        <div className="tournament_name_warning">
        {`${i18n('safeTournamentName')} ${i18n('inappropriateNameWarning')} ${i18n('emptyTournamentName')}`}
        </div>
        <div className="select_input">
          {formWidgets.renderSelect(i18n('variant'), 'variant', settings.tournament.availableVariants, settings.tournament.variant, false)}
        </div>
        {ctrl.startPositions !== undefined ?
          <div className={'select_input' + (settings.tournament.variant() !== '1' ? ' notVisible' : '')}>
            <label for="select_start_position">
              Position
            </label>
            <select id="select_start_position" className="positions">
              <option value={standardFen}>Initial Position</option>
              {ctrl.startPositions.map(c => {
                return (
                  <optgroup label={c.name}>
                    {c.positions.map(p =>
                      <option value={p.fen}>{p.code + ' ' + p.name}</option>
                    )}
                  </optgroup>
                )
              })}
            </select>
          </div> : <input value="---" type="hidden" />
        }
        <div className="select_input">
          {formWidgets.renderSelect(i18n('mode'), 'mode', settings.tournament.availableModes, settings.tournament.mode, false)}
        </div>
        <div className="select_input inline">
          {formWidgets.renderSelect(i18n('timeControl'), 'time', settings.tournament.availableTimes, settings.tournament.time, false)}
        </div>
        <div className="select_input inline no-margin">
          {formWidgets.renderSelect(i18n('increment'), 'increment', settings.tournament.availableIncrements.map((x: string) => tupleOf(Number(x))), settings.tournament.increment, false)}
        </div>
        <div className="select_input inline">
          {formWidgets.renderSelect(i18n('duration'), 'duration', settings.tournament.availableDurations.map((x: string) => tupleOf(Number(x))), settings.tournament.duration, false)}
        </div>
        <div className="select_input inline no-margin">
          {formWidgets.renderSelect(i18n('timeBeforeTournamentStarts'), 'timeToStart', settings.tournament.availableTimesToStart.map((x: string) => tupleOf(Number(x))), settings.tournament.timeToStart, false)}
        </div>
        <div className="select_input">
          {formWidgets.renderCheckbox(i18n('isPrivate'), 'private', settings.tournament.private)}
        </div>
        <div className={'select_input no_arrow_after' + (settings.tournament.private() ? '' : ' notVisible')}>
          <div className="text_input_container">
            <label>{i18n('password')}</label>
            <input type="text"
              id="password"
              className="textField"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck={false}
            />
          </div>
        </div>
      </fieldset>
      <div className="popupActionWrapper">
        <button className="popupAction" type="submit">
          <span className="fa fa-check" />
          {i18n('createANewTournament')}
        </button>
      </div>
    </form>
  )
}

function create(form: HTMLFormElement) {
  const elements: HTMLCollection = (form[0] as HTMLFieldSetElement).elements 
  const name = (elements[0] as HTMLInputElement).value
  const variant = (elements[1] as HTMLInputElement).value
  const position = settings.tournament.variant() === '1' ? (elements[2] as HTMLInputElement).value : '---'
  const mode = (elements[3] as HTMLInputElement).value
  const time = (elements[4] as HTMLTextAreaElement).value
  const increment = (elements[5] as HTMLTextAreaElement).value
  const duration = (elements[6] as HTMLTextAreaElement).value
  const timeToStart = (elements[7] as HTMLTextAreaElement).value
  const isPrivate = (elements[8] as HTMLInputElement).checked ? (elements[8] as HTMLInputElement).value : ''
  const password = isPrivate ? (elements[9] as HTMLInputElement).value : ''

  xhr.create(name, variant, position, mode, time, increment, duration, timeToStart, isPrivate, password)
  .then((data: TournamentCreateResponse) => {
    close()
    router.set('/tournament/' + data.id)
  })
  .catch(utils.handleXhrError)
}
