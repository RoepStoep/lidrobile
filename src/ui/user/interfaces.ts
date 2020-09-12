import { Prop } from '~/utils'
import { Related } from '../../lidraughts/interfaces/user'
import { Paginator } from '../../lidraughts/interfaces'

export interface IRelationCtrl {
  related: Prop<Related[] | null>
  loadNextPage: (page: number) => void
  isLoadingNextPage: Prop<boolean>
  toggleFollowing: (obj: Related) => void
  challenge: (id: string) => void
  paginator: Prop<Paginator<Related> | undefined>
}
