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
// Cached object URLs are keyed by storage path. New uploads use immutable game
// paths, while migrated legacy rows may still use the old fixed path.
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

// Original metadata is reserved before upload and remains append-only. Once
// original bytes exist, no participant failure or replacement path deletes
// them; pending stored originals remain discoverable to the host export.
export async function uploadSubmission(challengeId: number, photo: PreparedPhoto) {
  const db = client()
  const { data: reservations, error: reservationError } = await db.rpc('reserve_original_version', {
    selected_challenge_id: challengeId,
    archive_extension: photo.archiveExtension,
    archive_filename: photo.originalFilename,
    archive_mime: photo.archiveMime,
    archive_bytes: photo.archive.size,
    archive_width: photo.width,
    archive_height: photo.height,
    archive_status: photo.archiveStatus,
    source_bytes: photo.sourceBytes,
    source_mime: photo.sourceMime,
    game_copy_bytes: photo.gameCopy.size,
  })
  if (reservationError) throw reservationError
  const reservation = (reservations as Array<{ version_id: string; original_path: string; game_path: string }> | null)?.[0]
  if (!reservation) throw new Error('Could not reserve the original photo archive.')

  const { error: originalError } = await db.storage
    .from('photo-originals')
    .upload(reservation.original_path, photo.archive, { contentType: photo.archiveMime, upsert: false })
  if (originalError) throw originalError

  const { error: uploadError } = await db.storage
    .from('photos')
    .upload(reservation.game_path, photo.gameCopy, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) throw uploadError
  invalidatePhoto(reservation.game_path)

  const { error: activationError } = await db.rpc('activate_original_version', {
    selected_version_id: reservation.version_id,
  })
  if (activationError) throw activationError
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
  const { data, error } = await client().rpc('list_original_versions')
  if (error) throw error
  const rows = data as Array<{
    version_id: string
    submission_id: string | null
    challenge_id: number
    challenge_slug: string
    challenge_title: string
    challenge_sort_order: number
    user_id: string
    owner_name: string
    original_path: string
    original_filename: string
    original_mime: string
    original_bytes: number
    original_width: number | null
    original_height: number | null
    original_status: string
    original_source_bytes: number | null
    original_source_mime: string | null
    version_state: string
    is_current: boolean
    created_at: string
  }>

  return rows.map((row) => ({
      versionId: row.version_id,
      submissionId: row.submission_id,
      challengeId: Number(row.challenge_id),
      challengeSlug: row.challenge_slug,
      challengeTitle: row.challenge_title,
      challengeSortOrder: Number(row.challenge_sort_order),
      userId: row.user_id,
      ownerName: row.owner_name,
      originalPath: row.original_path,
      originalFilename: row.original_filename,
      originalMime: row.original_mime,
      originalBytes: Number(row.original_bytes),
      originalWidth: row.original_width,
      originalHeight: row.original_height,
      originalStatus: row.original_status as OriginalStatus,
      originalSourceBytes: row.original_source_bytes ?? null,
      originalSourceMime: row.original_source_mime ?? null,
      versionState: row.version_state as 'pending' | 'ready',
      isCurrent: row.is_current,
      createdAt: row.created_at,
    }))
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

export async function submitVotes(challengeId: number, selections: Array<{ id: string; storagePath: string }>) {
  const { error } = await client().rpc('submit_votes', {
    selected_challenge_id: challengeId,
    selected_submission_ids: selections.map((selection) => selection.id),
    selected_storage_paths: selections.map((selection) => selection.storagePath),
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
