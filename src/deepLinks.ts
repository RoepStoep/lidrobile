import router from './router'
import i18n from './i18n'
import session, { Session } from './session'
import signupModal from './ui/signupModal'
import { handleXhrError } from './utils'
import { cleanFenUri } from './utils/fen'
import { getChallenge } from './xhr'
import { analysableVariants, puzzleVariants } from './lidraughts/game'
import { getInitialFen } from './lidraughts/variant'

export default {
  init() {
    const universalLinks = window.universalLinks

    universalLinks.subscribe('analysis', () => router.set('/analyse'))
    universalLinks.subscribe('analysisPosition', handleAnalysisPosition)
    universalLinks.subscribe('study', (e: UniversalLinks.EventData) => {
      const path = e.path.split('/')
      const id = path[2]
      const chapterId = path[3]
      if (chapterId) {
        router.set(`/study/${id}/chapter/${chapterId}`)
      } else {
        router.set(`/study/${id}`)
      }
    })
    universalLinks.subscribe('challenge', (eventData: UniversalLinks.EventData) => router.set('/challenge/' + eventData.path.split('/').pop()))
    universalLinks.subscribe('editor', handleEditor)
    universalLinks.subscribe('editorPosition', handleEditorPosition)
    universalLinks.subscribe('inbox', () => router.set('/inbox'))
    universalLinks.subscribe('inboxNew', () => router.set('/inbox/new'))
    universalLinks.subscribe('players', () => router.set('/players'))
    universalLinks.subscribe('tournamentDetail', (eventData: UniversalLinks.EventData) => router.set('/tournament/' + eventData.path.split('/').pop()))
    universalLinks.subscribe('tournamentList', () => router.set('/tournament'))
    universalLinks.subscribe('training', () => router.set('/training'))
    universalLinks.subscribe('trainingProblem', handleTrainingProblem)
    universalLinks.subscribe('tv', () => router.set('/tv'))
    universalLinks.subscribe('tvChannel', (eventData: UniversalLinks.EventData) => router.set('/tv/' + eventData.path.split('/').pop()))
    universalLinks.subscribe('userVariantProfile', handleVariantProfile)
    universalLinks.subscribe('userTV', (eventData: UniversalLinks.EventData) => router.set('/@/' + eventData.path.split('/')[2] + '/tv'))
    universalLinks.subscribe('userProfile', (eventData: UniversalLinks.EventData) => router.set('/@/' + eventData.path.split('/').pop()))
    universalLinks.subscribe('signupConfirm', (data: UniversalLinks.EventData) => {
      const token = data.path.split('/').pop()
      if (token) {
        session.confirmEmail(token)
        .then((data: Session) => {
          signupModal.close()
          router.set(`/@/${data.id}`)
          setTimeout(() => {
            window.plugins.toast.show(i18n('loginSuccessful'), 'long', 'center')
          }, 1000)
        })
        .catch(handleXhrError)
      }
    })
    universalLinks.subscribe('other', handleOther)
  }
}

function handleVariantProfile (eventData: UniversalLinks.EventData) {
  const pieces = eventData.path.split('/')
  const uid = pieces[2]
  const variant = pieces[4]
  router.set('/@/' + uid + '/' + variant + '/perf')
}

// handle link like:
// https://lidraughts.org/analysis/breakthrough
// https://lidraughts.org/analysis/frysk/W%3AW46%2C47%2C48%2C49%2C50%3AB1%2C2%2C3%2C4%2C6%3AH0%3AF1%3A%2B0%2B0
function handleAnalysisPosition (eventData: UniversalLinks.EventData) {
  let pathSuffix = eventData.path.replace('/analysis', '')

  let variant = 'standard'
  const pieces = pathSuffix.split('/')
  if (analysableVariants.includes(pieces[1])) {
    variant = pieces[1]
    pathSuffix = pathSuffix.substring(variant.length + 1)
  }

  pathSuffix = cleanFenUri(pathSuffix)
  if (pathSuffix) {
    router.set(`/analyse/variant/${variant}/fen/${encodeURIComponent(pathSuffix)}`)
  } else {
    router.set(`/analyse/variant/${variant}`)
  }
}

// handle links like 
// https://lidraughts.org/editor
// https://lidraughts.org/editor?fen=W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19:H0:F1:+0+0&variant=frisian
function handleEditor (eventData: UniversalLinks.EventData) {
  const variantParam = (<any>eventData.params).variant, fenParam = (<any>eventData.params).fen,
    variant = analysableVariants.includes(variantParam) ? variantParam : 'standard',
    fen = fenParam || getInitialFen(variant as VariantKey)

  router.set(`/editor/variant/${variant}/fen/${encodeURIComponent(fen)}`)
}

// handle links like 
// https://lidraughts.org/editor/frysk
// https://lidraughts.org/editor/breakthrough/W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19:H0:F1:+0+0
function handleEditorPosition (eventData: UniversalLinks.EventData) {
  let pathSuffix = eventData.path.replace('/editor', '')

  let variant = 'standard'
  const pieces = pathSuffix.split('/')
  if (analysableVariants.includes(pieces[1])) {
    variant = pieces[1]
    pathSuffix = pathSuffix.substring(variant.length + 1)
  }

  pathSuffix = cleanFenUri(pathSuffix)

  const fen = pathSuffix || getInitialFen(variant as VariantKey)
  router.set(`/editor/variant/${variant}/fen/${encodeURIComponent(fen)}`)
}

function handleTrainingProblem (eventData: UniversalLinks.EventData) {
  const pieces = eventData.path.split('/')
  if (pieces[2] === 'coordinate') {
    window.open(eventData.url, '_blank', 'location=no')
  }
  else if (puzzleVariants.includes(pieces[2])) {
    router.set(`/training/${pieces.length > 3 ? pieces[3] : '0'}/variant/${pieces[2]}`)
  }
  else {
    router.set('/training/' + pieces[2])
  }
}

function handleOther (eventData: UniversalLinks.EventData) {
  const pieces = eventData.path.split('/')
  if (eventData.path.search('^\/([a-zA-Z0-9]{8})$') !== -1) {
    getChallenge(pieces[1])
    .then(() =>
      router.set('/challenge/' + pieces[1])
    )
    .catch(() => router.set('/game/' + pieces[1]))
  }
  else if (eventData.path.search('^\/([a-zA-Z0-9]{8})+\/+(white|black)$') !== -1) {
    router.set('/game/' + pieces[1] + `?color=${pieces[2]}`)
  }
  else if (eventData.path.search('^\/([a-zA-Z0-9]{12})$') !== -1) {
    router.set('/game/' + pieces[1])
  }
  else {
    window.open(eventData.url, '_blank', 'location=no')
  }
}
