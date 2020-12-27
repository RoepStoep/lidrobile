import redraw from '../../utils/redraw'
import settings from '../../settings'
import { handleXhrError } from '../../utils'
import * as xhr from './tournamentXhr'
import { TournamentListItem, TournamentLists } from '../../lidraughts/interfaces/tournament'

export default class TournamentsListCtrl {
  tournaments: TournamentLists | undefined
  currentTab: number
  startPositions: BoardPositionCategory[] | undefined

  constructor(defaultTab?: number) {
    this.currentTab = defaultTab || 0

    xhr.currentTournaments()
    .then(data => {
      data.started = data.started.filter(supported)
      data.created = data.created.filter(supported)
      data.finished = data.finished.filter(supported)
      data.started.sort(sortByLidraughtsAndDate)
      data.finished.sort(sortByEndDate)
      this.tournaments = data
      redraw()
    })
    .catch(handleXhrError)

    /*loadLocalJsonFile<BoardPositionCategory[]>('data/positions.json')
    .then(data => {
      this.startPositions = data
      redraw()
    })*/
  }

  onTabChange = (tabIndex: number) => {
    const loc = window.location.search.replace(/\?tab=\w+$/, '')
    try {
      window.history.replaceState(window.history.state, '', loc + '?tab=' + tabIndex)
    } catch (e) { console.error(e) }
    this.currentTab = tabIndex
    redraw()
  }
}

function supported(t: TournamentListItem) {
  return settings.game.supportedVariants.indexOf(t.variant.key) !== -1
}

function sortByLidraughtsAndDate(a: TournamentListItem, b: TournamentListItem) {
  if (a.createdBy === 'lidraughts' && b.createdBy === 'lidraughts') {
    return a.startsAt - b.startsAt
  } else if (a.createdBy === 'lidraughts') {
    return -1
  } else {
    return 1
  }
}

function sortByEndDate(a: TournamentListItem, b: TournamentListItem) {
  return b.finishesAt - a.finishesAt
}
