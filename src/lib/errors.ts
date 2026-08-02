export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error !== 'object' || error === null || !('message' in error)) return fallback

  const message = error.message
  return typeof message === 'string' && message.trim() ? message : fallback
}
