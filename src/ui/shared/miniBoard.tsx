import h from 'mithril/hyperscript'
import * as helper from '../helper'
import { noop, formatTimeInSecs } from '../../utils'
import { FeaturedGame2 } from '../../lidraughts/interfaces'
import settings from '../../settings'
import ViewOnlyBoard from './ViewOnlyBoard'
import CountdownTimer from './CountdownTimer'
import { renderTitle } from '~/ui/user/userView'

export interface Attrs {
  readonly fen: string
  readonly orientation: Color
  readonly link?: () => void
  readonly gameObj?: FeaturedGame2
  readonly topText?: string
  readonly bottomText?: string
  readonly lastMove?: string
  readonly customPieceTheme?: string
  readonly variant: VariantKey
  readonly fixed?: boolean
}

interface State {
  link: () => void
}

const MiniBoard: Mithril.Component<Attrs, State> = {
  oninit({ attrs }) {
    this.link = attrs.link || noop
  },
  onupdate({ attrs }) {
    this.link = attrs.link || noop
  },
  view({ attrs }) {

    const { gameObj, topText, bottomText } = attrs
    const isWhite = gameObj?.orientation === 'white'

    return (
      <div className="mini_board_container">
        {gameObj ?
          renderPlayer(gameObj, isWhite ? 'black' : 'white') :
          topText ? h('div.mini_board__text', topText) : null
        }
        <div className="mini_board" oncreate={helper.ontapY(() => this.link())}>
          <div className="mini_board_helper">
            <div className="mini_board_wrapper">
              {h(ViewOnlyBoard, attrs)}
            </div>
          </div>
        </div>
        {gameObj ?
          renderPlayer(gameObj, isWhite ? 'white' : 'black') :
          bottomText ? h('div.mini_board__text', bottomText) : null
        }
      </div>
    )
  }
}

function fenColor(fen: string) {
  return fen.startsWith('B:') ? 'black' : 'white'
}

function renderPlayer(gameObj: FeaturedGame2, color: Color) {
  const player = gameObj[color]
  const time = gameObj.c && gameObj.c[color]
  const turn = fenColor(gameObj.fen)
  return h('div.mini_board__player', [
    h('span.mini_board__user', [
      player.rank ? `#${player.rank} ` : '',
      renderTitle(player.title),
      player.name,
      h('span.rating', player.rating),
      player.berserk ? h('span.berserk[data-icon=`]') : null,
    ]),
    gameObj.finished ? renderScore(color, gameObj.winner) :
      time && !isNaN(time) ? renderTime(color, time, turn) : null
  ])
}

function renderScore(color: Color, winner?: Color) {
  const dr = settings.game.draughtsResult()
  return h('span.score', winner ? (color === winner ? (dr ? '2' : '1') : '0') : (dr ? '1' : '½'))
}

function renderTime(color: Color, time: number, turnColor: Color) {
  return turnColor === color ?
    h(CountdownTimer, { seconds: time }) :
    h('span.mini_board__clock', formatTimeInSecs(time))
}

export default MiniBoard
