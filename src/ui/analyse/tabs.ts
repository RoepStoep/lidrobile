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
  title: 'Move list',
  className: 'fa fa-list-alt'
}

export const ceval: Tab = {
  id: 'ceval',
  title: 'Scan',
  className: 'fa fa-cogs'
}

export const explorer: Tab = {
  id: 'explorer',
  title: 'openingExplorerAndTablebase',
  className: 'fa fa-book'
}

export const charts: Tab = {
  id: 'analysis',
  title: 'gameAnalysis',
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
