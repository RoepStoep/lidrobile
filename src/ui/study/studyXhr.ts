import { fetchJSON, fetchText } from '../../http'
import { Paginator } from '../../lidraughts/interfaces'
import { AnalyseData } from '../../lidraughts/interfaces/analyse'
import { Study, PagerOrder, PagerData, PagerCategory } from '../../lidraughts/interfaces/study'

interface StudyXhrData {
  analysis: AnalyseData
  study: Study
}

interface StudyPager {
  paginator: Paginator<PagerData>
}

export function list(
  category: PagerCategory = 'all',
  order: PagerOrder = 'hot',
  page = 1,
  feedback = false
): Promise<StudyPager> {
  return fetchJSON(`/study/${category}/${order}`, {
    query: {
      page
    }
  }, feedback)
}

export function search(
  q: string,
  page = 1,
  feedback = false
): Promise<StudyPager> {
  return fetchJSON('/study/search', {
    query: {
      q,
      page
    }
  }, feedback)
}


export function load(id: string, chapterId?: string): Promise<StudyXhrData> {
  return fetchJSON<StudyXhrData>(`/study/${id}` + (chapterId ? `/${chapterId}` : ''))
}

export function studyPDN(id: string) {
  return fetchText(`/study/${id}.pdn`, undefined, true)
}

export function studyChapterPDN(id: string, chapterId: string) {
  return fetchText(`/study/${id}/${chapterId}.pdn`, undefined, true)
}
