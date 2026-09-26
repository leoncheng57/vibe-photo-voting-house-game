// One entry per playable app. The slug is also the deploy path, so renaming one
// breaks every invite and blog link already published against it — add a
// LEGACY_ROUTE_REDIRECTS entry instead of changing a slug in place.

import type { WinnerMode } from '../types'

export const APP_IDS = ['house-party', 'bday-hunt'] as const

export type AppId = typeof APP_IDS[number]

export interface AppDefinition {
  id: AppId
  slug: string
  name: string
  shortName: string
  kicker: string
  tagline: string
  description: string
  // A closed app keeps its route, but the front page shows it as closed
  // instead of offering Play.
  open: boolean
  // Wording that names the occasion, so neither game borrows the other's.
  copy: {
    stripe: string
    place: string
    champion: string
    glory: string
  }
  // Used only until the party's own settings load (and before a guest has
  // joined, when they cannot be read). The party_settings row stays authoritative.
  defaultWinnerMode: WinnerMode
}

export const APPS: Record<AppId, AppDefinition> = {
  'house-party': {
    id: 'house-party',
    slug: 'house-party',
    name: 'House Photo Hunt',
    shortName: 'House',
    kicker: 'A camera-roll house party',
    tagline: 'Find it. Frame it. Fight for it.',
    description:
      'Six photo challenges indoors. Everyone shoots, the room votes anonymously, and the biggest screen in the house runs the reveal.',
    open: false,
    copy: { stripe: 'HOUSEWARMING · ONE NIGHT ONLY', place: 'the house', champion: 'house champion', glory: 'Eternal house glory' },
    defaultWinnerMode: 'voting',
  },
  'bday-hunt': {
    id: 'bday-hunt',
    slug: 'bday-hunt',
    name: 'Outdoor Birthday Hunt',
    shortName: 'Birthday',
    kicker: 'A birthday scavenger hunt outdoors',
    tagline: 'Get outside. Get the shot.',
    description:
      'The same photo hunt taken outdoors for a birthday: roam further, shoot in daylight, and crown the day over one shared screen.',
    open: true,
    copy: { stripe: 'BIRTHDAY · ONE DAY ONLY', place: 'the hunt', champion: 'birthday champion', glory: 'Eternal birthday glory' },
    defaultWinnerMode: 'random',
  },
}

export const DEFAULT_APP_ID: AppId = 'house-party'

// Where pages that belong to no app (the front page, developer references)
// send someone who wants to play: the first open app, so a closed game's
// links are never the way back in.
export const PLAYABLE_APP_ID: AppId = APP_IDS.find((appId) => APPS[appId].open) ?? DEFAULT_APP_ID

// Routes that shipped before the repo held more than one app. Every one of them
// still has to resolve, so each keeps an HTML stub that redirects here.
export const LEGACY_ROUTE_REDIRECTS: Record<string, AppId> = {
  play: 'house-party',
  home: 'house-party',
}
