import { Toast } from '@capacitor/toast'
import throttle from 'lodash-es/throttle'
import h from 'mithril/hyperscript'
import router from '../../router'
import i18n, { plural } from '../../i18n'
import { UserGameWithDate } from '../../lidraughts/interfaces/user'
import spinner from '../../spinner'

import * as helper from '../helper'
import GameItem from '../shared/GameItem'
import { isSupportedVariantKey } from '../../lidraughts/game'

import { ISearchCtrl } from './SearchCtrl'
import { SearchQuery } from './interfaces'

interface SearchSelect {
  name: string
  options: SearchOption[]
  placeholder?: string
  noEmpty?: boolean
}

interface SearchOption {
  value: string
  label: string
}

export function renderSearchForm(ctrl: ISearchCtrl) {
  const players = getPlayers(ctrl.query)
  const isComputerOpp = ctrl.query.hasAi === '1'
  return (
    <div id="searchContent" className="native_scroller searchWraper"
      onscroll={throttle(ctrl.onScroll, 30)}
    >
      <form id="advancedSearchForm"
        onsubmit={(e: Event) => {
          e.preventDefault()
          ctrl.search()
        }}
      >
        <div className="game_search_row">
          <label>{i18n('players')}</label>
          <div className="game_search_input_wrapper">
            <div className="game_search_input">
              <input
                type="text"
                name="players.a"
                value={ctrl.query['players.a']}
                oninput={throttle(ctrl.handleChange('players.a'), 200)}
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck={false}
              />
            </div>
            <div className="game_search_input">
              <input
                type="text"
                name="players.b"
                value={ctrl.query['players.b']}
                oninput={throttle(ctrl.handleChange('players.b'), 200)}
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck={false}
              />
            </div>
          </div>
        </div>
        {renderSelectRow(ctrl, i18n('white'), !!players.length, { name: 'players.white', options: players})}
        {renderSelectRow(ctrl, i18n('black'), !!players.length, { name: 'players.black', options: players})}
        {renderSelectRow(ctrl, i18n('winner'), !!players.length, { name: 'players.winner', options: players})}
        {renderSelectRow(ctrl, i18n('ratingRange'), true, { name: 'ratingMin', options: ratingOptions, placeholder: i18n('from')}, {name: 'ratingMax', options: ratingOptions, placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('opponent'), true, { name: 'hasAi', options: opponentOptions() })}
        {renderSelectRow(ctrl, i18n('aiLevel'), isComputerOpp, {name: 'aiLevelMin', options: aiLevelOptions(), placeholder: i18n('from')}, { name: 'aiLevelMax', options: aiLevelOptions(), placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('source'), true, { name: 'source', options: sourceOptions})}
        {renderSelectRow(ctrl, i18n('variant'), true, { name: 'perf', options: perfOptions})}
        {renderSelectRow(ctrl, i18n('mode'), true, { name: 'mode', options: modeOptions()})}
        {renderSelectRow(ctrl, i18n('numberOfTurns'), true, { name: 'turnsMin', options: turnOptions(), placeholder: i18n('from')}, {name: 'turnsMax', options: turnOptions(), placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('duration'), true, { name: 'durationMin', options: durationOptions(), placeholder: i18n('from')}, {name: 'durationMax', options: durationOptions(), placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('clockInitialTime'), true, { name: 'clock.initMin', options: timeOptions(), placeholder: i18n('from')}, {name: 'clock.initMax', options: timeOptions(), placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('clockIncrement'), true, { name: 'clock.incMin', options: incrementOptions(), placeholder: i18n('from')}, {name: 'clock.incMax', options: incrementOptions(), placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('result'), true, { name: 'status', options: resultOptions})}
        {renderSelectRow(ctrl, i18n('winner'), true, {name: 'winnerColor', options: winnerOptions()})}
        {renderSelectRow(ctrl, i18n('date'), true, { name: 'dateMin', options: dateOptions, placeholder: i18n('from'), noEmpty: true }, {name: 'dateMax', options: dateOptions, placeholder: i18n('to')})}
        {renderSelectRow(ctrl, i18n('sortBy'), true, { name: 'sort.field', options: sortFieldOptions(), noEmpty: true }, {name: 'sort.order', options: sortOrderOptions(), noEmpty: true })}
        <div className="game_search_row">
          <label>{i18n('computerAnalysis')}</label>
          <div className="game_search_input_wrapper">
            <div className="game_search_input full">
              <div className="check_container">
                <input type="checkbox" name="analysed" checked={ctrl.query.analysed === '1'} onchange={ctrl.toggleAnalysis} />
              </div>
            </div>
          </div>
        </div>
        <button className="fatButton" type="submit">
          <span className="fa fa-search" />
          {i18n('search')}
        </button>
      </form>
      {renderResult(ctrl)}
      {renderPaginator(ctrl)}
    </div>
  )
}

function getButton(e: Event): HTMLElement | undefined {
  const target = (e.target as HTMLElement)
  return target.tagName === 'BUTTON' ? target : undefined
}

interface GameDataSet extends DOMStringMap {
  id: string
}
function onTap (ctrl: ISearchCtrl, e: TouchEvent) {
  const starButton = getButton(e)
  const el = helper.closest(e, '.userGame')
  const id = (el?.dataset as GameDataSet).id
  if (starButton) {
    ctrl.toggleBookmark(id)
  } else {
    if (id) {
      const g = ctrl.searchState.games.find(game => game.id === id)
      if (g) {
        if (!isSupportedVariantKey(g.variant.key)) {
          Toast.show({ text: i18n('unsupportedVariant', g.variant.name), position: 'center', duration: 'short' })
        } else {
          router.set(`/analyse/online/${id}`)
        }
      }
    }
  }
}

function renderResult(ctrl: ISearchCtrl) {
  const children = ctrl.searchState.searching ? spinner.getVdom('monochrome') :
    ctrl.searchState.paginator === undefined ? null :
      ctrl.searchState.games.length === 0 ?
        h('div.search-empty', i18n('noGameFound')) :
          h.fragment({ oncreate: ctrl.onGamesLoaded }, [
            ctrl.searchState.games.map((g: UserGameWithDate, index: number) =>
              h(GameItem, { key: g.id, g, index, boardTheme: ctrl.boardTheme })
            ),
          ])

  return h('ul.searchGamesList', {
    className: ctrl.searchState.searching ? 'searching' : '',
    oncreate: helper.ontapY(e => onTap(ctrl, e), undefined, helper.closestHandler('.userGame'))
  }, children)
}

function renderPaginator(ctrl: ISearchCtrl) {
  return ctrl.searchState.paginator && ctrl.searchState.paginator.nextPage ?
    h('div.moreButton', [
      h('button', {
        oncreate: helper.ontap(ctrl.more)
      }, h('span.fa.fa-arrow-down'))
    ]) : null
}

function renderSelectRow(ctrl: ISearchCtrl, label: string, isDisplayed: boolean, select1: SearchSelect, select2?: SearchSelect) {
  if (!isDisplayed) return null

  const select1Val = ctrl.query[select1.name]

  return (
    <div className="game_search_row">
      <label>{label}</label>
      <div className="game_search_input_wrapper">
        <div className={'game_search_select' + (select2 ? '' : ' full')}>
          <label>{select1Val === '' && select1.placeholder ? select1.placeholder : ''}</label>
          <select value={select1Val} name={select1.name} onchange={ctrl.handleChange(select1.name)}>
            { !select1.noEmpty ?
              <option value=""></option> :
              null
            }
            {select1.options.map(renderOption)}
          </select>
        </div>
        {select2 ?
          <div className="game_search_select">
            <label>{ctrl.query[select2.name] === '' && select2.placeholder ? select2.placeholder : ''}</label>
            <select value={ctrl.query[select2.name]} name={select2.name} onchange={ctrl.handleChange(select2.name)}>
              { !select2.noEmpty ?
                <option value=""></option> :
                null
              }
              {select2.options.map(renderOption)}
            </select>
          </div> : null
        }
      </div>
    </div>
  )
}

function renderOption(opt: SearchOption) {
  return <option key={opt.value} value={opt.value}>{opt.label}</option>
}

function getPlayers(query: SearchQuery): Array<SearchOption> {
  const players: Array<SearchOption> = []
  const playerA = query['players.a']
  const playerB = query['players.b']
  if (playerA) {
    players.push({value: playerA, label: playerA})
  }
  if (playerB) {
    players.push({value: playerB, label: playerB})
  }
  return players
}

const searchOpts = {
  ratings: ['600', '700', '800', '900', '1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000', '2100', '2200', '2300', '2400', '2500', '2600', '2700', '2800', '2900'],
  opponents: [['0', 'human'], ['1', 'computer']],
  aiLevels: ['1', '2', '3', '4', '5', '6', '7', '8'],
  sources: [['1', 'Lobby'], ['2', 'Friend'], ['3', 'Ai'], ['6', 'Position'], ['7', 'Import'], ['5', 'Tournament'], ['10', 'Simul'], ['12', 'Pool'], ['13', 'Swiss']],
  perfs: [['0', 'UltraBullet'], ['1', 'Bullet'], ['2', 'Blitz'], ['6', 'Rapid'], ['3', 'Classical'], ['4', 'Correspondence'], ['11', 'Frisian'], ['16', 'Frysk!'], ['13', 'Antidraughts'], ['17', 'Breakthrough'], ['22', 'Russian'], ['23', 'Brazilian']],
  modes: [['0', 'casual'], ['1', 'rated']],
  turns: ['1', '2', '3', '4', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '60', '70', '80', '90', '100', '125', '150', '175', '200', '225', '250', '275', '300'],
  durations: [['30', 'nbSeconds'], ['60', 'nbMinutes'], ['120', 'nbMinutes'], ['160', 'nbMinutes'], ['300', 'nbMinutes'], ['600', 'nbMinutes'], ['900', 'nbMinutes'], ['1200', 'nbMinutes'], ['1800', 'nbMinutes'], ['3600', 'nbHours'], ['7200', 'nbHours'], ['10800', 'nbHours']],
  times: [['0', 'nbSeconds'], ['30', 'nbSeconds'], ['45', 'nbSeconds'], ['60', 'nbMinutes'], ['120', 'nbMinutes'], ['180', 'nbMinutes'], ['300', 'nbMinutes'], ['600', 'nbMinutes'], ['900', 'nbMinutes'], ['1200', 'nbMinutes'], ['1800', 'nbMinutes'], ['2700', 'nbMinutes'], ['3600', 'nbMinutes'], ['5400', 'nbMinutes'], ['7200', 'nbMinutes'], ['9000', 'nbMinutes'], ['10800', 'nbMinutes']],
  increments: [['0', 'nbSeconds'], ['1', 'nbSeconds'], ['2', 'nbSeconds'], ['3', 'nbSeconds'], ['5', 'nbSeconds'], ['10', 'nbSeconds'], ['15', 'nbSeconds'], ['20', 'nbSeconds'], ['30', 'nbSeconds'], ['45', 'nbSeconds'], ['60', 'nbSeconds'], ['90', 'nbSeconds'], ['120', 'nbSeconds'], ['150', 'nbSeconds'], ['180', 'nbSeconds']],
  results: [['30', 'Win'], ['31', 'Resign'], ['34', 'Draw'], ['35', 'Clock Flag'], ['60', 'Variant End']],
  winners: [['1', 'white'], ['2', 'black'], ['3', 'none']],
  dates: [['0d', 'Now'], ['1h', '1 hour ago'], ['2h', '2 hours ago'], ['6h', '6 hours ago'], ['1d', '1 day ago'], ['2d', '2 days ago'], ['3d', '3 days ago'], ['4d', '4 days ago'], ['5d', '5 days ago'], ['6d', '6 days ago'], ['1w', '1 week ago'], ['2w', '2 weeks ago'], ['3w', '3 weeks ago'], ['4w', '4 weeks ago'], ['5w', '5 weeks ago'], ['6w', '6 weeks ago'], ['1m', '1 month ago'], ['2m', '2 months ago'], ['3m', '3 months ago'], ['4m', '4 months ago'], ['5m', '5 months ago'], ['6m', '6 months ago'], ['1y', '1 year ago'], ['2y', '2 years ago'], ['3y', '3 years ago'], ['4y', '4 years ago'], ['5y', '5 years ago']],
  sortFields: [['d', 'date'], ['t', 'numberOfTurns'], ['a', 'averageElo']],
  sortOrders: [['desc', 'descending'], ['asc', 'ascending']]
}

const translateFromSeconds = (val: string, key: string) => {
  const nb = parseInt(val) || 0
  if (key === 'nbMinutes') {
    return plural(key, Math.floor(nb / 60))
  } else if (key === 'nbHours') {
    return plural(key, Math.floor(nb / 3600))
  }
  return plural(key, nb)
}

const ratingOptions = searchOpts.ratings.map((a: string) => ({value: a, label: a}))
const opponentOptions = () => searchOpts.opponents.map((a: Array<string>) => ({value: a[0], label: i18n(a[1])}))
const aiLevelOptions = () => searchOpts.aiLevels.map((a: string) => ({value: a, label: i18n('level') + ' ' + a}))
const sourceOptions = searchOpts.sources.map((a: Array<string>) => ({value: a[0], label: a[1]}))
const perfOptions = searchOpts.perfs.map((a: Array<string>) => ({value: a[0], label: a[1]}))
const modeOptions = () => searchOpts.modes.map((a: Array<string>) => ({value: a[0], label: i18n(a[1])}))
const turnOptions = () => searchOpts.turns.map((a: string) => ({value: a, label: plural('nbTurns', parseInt(a))}))
const durationOptions = () => searchOpts.durations.map((a: Array<string>) => ({value: a[0], label: translateFromSeconds(a[0], a[1])}))
const timeOptions = () => searchOpts.times.map((a: Array<string>) => ({value: a[0], label: translateFromSeconds(a[0], a[1])}))
const incrementOptions = () => searchOpts.increments.map((a: Array<string>) => ({value: a[0], label: translateFromSeconds(a[0], a[1])}))
const resultOptions = searchOpts.results.map((a: Array<string>) => ({value: a[0], label: a[1]}))
const winnerOptions = () => searchOpts.winners.map((a: Array<string>) => ({value: a[0], label: i18n(a[1])}))
const dateOptions = searchOpts.dates.map((a: Array<string>) => ({value: a[0], label: a[1]}))
const sortFieldOptions = () => searchOpts.sortFields.map((a: Array<string>) => ({value: a[0], label: i18n(a[1])}))
const sortOrderOptions = () => searchOpts.sortOrders.map((a: Array<string>) => ({value: a[0], label: i18n(a[1])}))
