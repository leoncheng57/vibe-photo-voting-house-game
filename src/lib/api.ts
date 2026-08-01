import type { User } from '@supabase/supabase-js'
import type { Challenge, LeaderboardEntry, OriginalRecord, OriginalStatus, PartyStatus, Profile, StorageUsage, Submission } from '../types'
import type { PreparedPhoto } from './images'
import { supabase } from './supabase'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function ensureAnonymousUser(): Promise<User> {
  const db = client()
  const { data: sessionData } = await db.auth.getSession()
  if (sessionData.session?.user) return sessionData.session.user

  const { data, error } = await db.auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('Could not join the party.')
  return data.user
}

export async function signOut(): Promise<void> {
  clearPhotoCache()
  const { error } = await client().auth.signOut()
  if (error) throw error
}

export async function getPartyStatus(): Promise<PartyStatus> {
  const { data, error } = await client().rpc('get_party_status').single()
  if (error) throw error
  return data as PartyStatus
}

export async function joinParty(passphrase: string): Promise<void> {
  const { error } = await client().rpc('join_party', { party_passphrase: passphrase })
  if (error) throw error
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client()
    .from('profiles')
    .select('user_id, display_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProfile(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await client()
    .from('profiles')
    .insert({ user_id: userId, display_name: displayName.trim() })
    .select('user_id, display_name')
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await client()
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('user_id', userId)
    .select('user_id, display_name')
    .single()
  if (error) throw error
  return data
}

export async function getChallenges(): Promise<Challenge[]> {
  const { data, error } = await client()
    .from('challenges')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

// Photos are fetched through authenticated Storage downloads and rendered as
// browser-local blob URLs, so no reusable bearer URL ever leaves this device.
// Cached object URLs are keyed by storage path; replacing a photo reuses the
// same path, so callers must invalidate the path when a submission changes.
const photoUrlCache = new Map<string, string>()

async function getPhotoUrl(storagePath: string): Promise<string | undefined> {
  const cached = photoUrlCache.get(storagePath)
  if (cached) return cached

  const { data, error } = await client().storage.from('photos').download(storagePath)
  if (error || !data) return undefined

  const objectUrl = URL.createObjectURL(data)
  const raced = photoUrlCache.get(storagePath)
  if (raced) {
    URL.revokeObjectURL(objectUrl)
    return raced
  }
  photoUrlCache.set(storagePath, objectUrl)
  return objectUrl
}

export function invalidatePhoto(storagePath: string) {
  const objectUrl = photoUrlCache.get(storagePath)
  if (!objectUrl) return
  photoUrlCache.delete(storagePath)
  URL.revokeObjectURL(objectUrl)
}

export function clearPhotoCache() {
  for (const objectUrl of photoUrlCache.values()) URL.revokeObjectURL(objectUrl)
  photoUrlCache.clear()
}

export async function getSubmissions(challengeId?: number): Promise<Submission[]> {
  let query = client()
    .from('challenge_results')
    .select('submission_id, challenge_id, user_id, storage_path, display_name, vote_count, created_at')
  if (challengeId) query = query.eq('challenge_id', challengeId)

  const { data, error } = await query
  if (error) throw error
  if (!data.length) return []

  const photoUrls = await Promise.all(data.map((item) => getPhotoUrl(item.storage_path)))

  return data.map((item, index) => ({
    id: item.submission_id,
    challenge_id: item.challenge_id,
    user_id: item.user_id,
    storage_path: item.storage_path,
    created_at: item.created_at,
    ownerName: item.display_name,
    voteCount: item.vote_count,
    photoUrl: photoUrls[index],
  }))
}

// Upload order matters because the flow is not transactional:
// 1. the new original lands on a fresh versioned path (never overwrites),
// 2. the game JPEG replaces the fixed {user_id}/{challenge_id}.jpg object,
// 3. the submission row is updated to reference both,
// 4. only then is the superseded original removed.
// A failure at any step removes the just-uploaded original so the bucket
// never accumulates objects that no submission references.
export async function uploadSubmission(userId: string, challengeId: number, photo: PreparedPhoto) {
  const db = client()
  const storagePath = `${userId}/${challengeId}.jpg`
  const originalPath = `${challengeId}/${userId}/${Date.now()}.${photo.archiveExtension}`

  const { data: existing, error: existingError } = await db
    .from('submissions')
    .select('original_path')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existingError) throw existingError

  const { error: originalError } = await db.storage
    .from('photo-originals')
    .upload(originalPath, photo.archive, { contentType: photo.archiveMime, upsert: false })
  if (originalError) throw originalError

  async function discardNewOriginal() {
    await db.storage.from('photo-originals').remove([originalPath]).catch(() => undefined)
  }

  const { error: uploadError } = await db.storage
    .from('photos')
    .upload(storagePath, photo.gameCopy, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) {
    await discardNewOriginal()
    throw uploadError
  }
  invalidatePhoto(storagePath)

  const { error } = await db.from('submissions').upsert(
    {
      challenge_id: challengeId,
      user_id: userId,
      storage_path: storagePath,
      original_path: originalPath,
      original_filename: photo.originalFilename,
      original_mime: photo.archiveMime,
      original_bytes: photo.archive.size,
      original_width: photo.width,
      original_height: photo.height,
      original_status: photo.archiveStatus,
      original_source_bytes: photo.sourceBytes,
      original_source_mime: photo.sourceMime,
    },
    { onConflict: 'challenge_id,user_id' },
  )
  if (error) {
    await discardNewOriginal()
    throw error
  }

  if (existing?.original_path && existing.original_path !== originalPath) {
    await db.storage.from('photo-originals').remove([existing.original_path]).catch(() => undefined)
  }
}

export async function getStorageUsage(): Promise<StorageUsage[]> {
  const { data, error } = await client().rpc('get_storage_usage')
  if (error) throw error
  const rows = data as Array<{ bucket_id: string; total_bytes: number; object_count: number }>
  return rows.map((row) => ({
    bucketId: row.bucket_id,
    totalBytes: Number(row.total_bytes),
    objectCount: row.object_count,
  }))
}

// The submissions table relates to profiles both directly (user_id) and
// through views, so the profile and challenge embeds name their foreign keys
// explicitly; without that PostgREST refuses to guess and returns
// "Could not embed because more than one relationship was found".
export async function getAllOriginals(): Promise<OriginalRecord[]> {
  const { data, error } = await client()
    .from('submissions')
    .select('id, challenge_id, user_id, original_path, original_filename, original_mime, original_bytes, original_status, original_source_bytes, created_at, profile:profiles!submissions_user_id_fkey(display_name), challenge:challenges!submissions_challenge_id_fkey(slug, title, sort_order)')
    .not('original_path', 'is', null)
    .order('challenge_id')
    .order('created_at')
  if (error) throw error

  return data.map((row) => {
    const profile = row.profile as unknown as { display_name: string } | null
    const challenge = row.challenge as unknown as { slug: string; title: string; sort_order: number } | null
    return {
      submissionId: row.id,
      challengeId: row.challenge_id,
      challengeSlug: challenge?.slug ?? `challenge-${row.challenge_id}`,
      challengeTitle: challenge?.title ?? `Challenge ${row.challenge_id}`,
      challengeSortOrder: challenge?.sort_order ?? row.challenge_id,
      userId: row.user_id,
      ownerName: profile?.display_name ?? 'guest',
      originalPath: row.original_path as string,
      originalFilename: row.original_filename ?? '',
      originalMime: row.original_mime ?? 'image/jpeg',
      originalBytes: row.original_bytes ?? 0,
      originalStatus: (row.original_status ?? 'exact') as OriginalStatus,
      originalSourceBytes: row.original_source_bytes ?? null,
    }
  })
}

export async function downloadOriginal(originalPath: string): Promise<Blob> {
  const { data, error } = await client().storage.from('photo-originals').download(originalPath)
  if (error || !data) throw error ?? new Error('The original photo could not be downloaded.')
  return data
}

export async function getVotes(challengeId: number): Promise<string[]> {
  const { data, error } = await client()
    .from('votes')
    .select('submission_id')
    .eq('challenge_id', challengeId)
  if (error) throw error
  return data.map((vote) => vote.submission_id)
}

export async function submitVotes(challengeId: number, submissionIds: string[]) {
  const { error } = await client().rpc('submit_votes', {
    selected_challenge_id: challengeId,
    selected_submission_ids: submissionIds,
  })
  if (error) throw error
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await client()
    .from('leaderboard')
    .select('user_id, display_name, points, wins')
    .order('points', { ascending: false })
    .order('wins', { ascending: false })
    .order('display_name')
  if (error) throw error
  return data
}
