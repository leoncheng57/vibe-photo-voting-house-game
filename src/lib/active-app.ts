import { APPS, APP_IDS, DEFAULT_APP_ID, type AppId } from '../config/apps'

export function getAppIdFromPathname(pathname: string): AppId {
  const segments = pathname.split('/').filter(Boolean)
  return APP_IDS.find((appId) => segments.includes(APPS[appId].slug)) ?? DEFAULT_APP_ID
}

export function getActiveAppId(): AppId {
  if (typeof window === 'undefined') return DEFAULT_APP_ID
  return getAppIdFromPathname(window.location.pathname)
}

export function getAppBaseUrl(appId: AppId, siteBaseUrl: string): string {
  return `${siteBaseUrl}${APPS[appId].slug}/`
}
