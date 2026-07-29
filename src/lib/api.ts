import type { User } from '@supabase/supabase-js'
import type { Challenge, LeaderboardEntry, PartyStatus, Profile, Submission } from '../types'
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

export async function uploadSubmission(userId: string, challengeId: number, photo: Blob) {
  const storagePath = `${userId}/${challengeId}.jpg`
  const { error: uploadError } = await client().storage
    .from('photos')
    .upload(storagePath, photo, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError
  invalidatePhoto(storagePath)

  const { error } = await client().from('submissions').upsert(
    { challenge_id: challengeId, user_id: userId, storage_path: storagePath },
    { onConflict: 'challenge_id,user_id' },
  )
  if (error) throw error
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
