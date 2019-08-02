import { Related } from '../../lidraughts/interfaces/user'
import { Paginator } from '../../lidraughts/interfaces'

export interface IRelationCtrl {
  related: Mithril.Stream<Related[] | null>
  loadNextPage: (page: number) => void
  isLoadingNextPage: Mithril.Stream<boolean>
  toggleFollowing: (obj: Related) => void
  challenge: (id: string) => void
  paginator: Mithril.Stream<Paginator<Related> | undefined>
}
