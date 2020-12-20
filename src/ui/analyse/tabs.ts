import i18n from '../../i18n'

export interface Tab {
  id: string
  title: string
  className: string
}

export const gameInfos: Tab = {
  id: 'infos',
  title: 'Game information',
  className: 'fa fa-info-circle',
}

export const moves: Tab = {
  id: 'moves',
  title: i18n('movesPlayed'),
  className: 'fa fa-list-alt'
}

export const ceval: Tab = {
  id: 'ceval',
  title: 'Scan 3.1',
  className: 'fa fa-cogs'
}

export const explorer: Tab = {
  id: 'explorer',
  title: i18n('openingExplorerAndTablebase'),
  className: 'fa fa-book'
}

export const charts: Tab = {
  id: 'analysis',
  title: i18n('gameAnalysis'),
  className: 'fa fa-area-chart'
}

export const pdnTags: Tab = {
  id: 'pdnTags',
  title: 'pdnTags',
  className: 'fa fa-tags'
}

export const comments: Tab = {
  id: 'comments',
  title: 'Comments',
  className: 'fa fa-comment-o'
}

export const forecasts: Tab = {
  id: 'forecasts',
  title: i18n('conditionalPremoves'),
  className: 'fa fa-eye'
}
