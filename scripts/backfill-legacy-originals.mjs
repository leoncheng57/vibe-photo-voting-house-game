#!/usr/bin/env node
// One-time backfill: adopt pre-archive game JPEGs as "legacy" originals.
//
// Submissions created before migration 006 only have a 2400px-or-smaller game
// copy in the photos bucket. This script copies that JPEG into the private
// photo-originals bucket, records it in the append-only original_versions
// ledger, and points the active submission at it with original_status =
// 'legacy', so it appears in the Photo Export Runbook ZIP.
// The copies are NOT full-resolution captures — 'legacy' marks exactly that.
//
// Requires the service-role key (bypasses RLS); never commit it.
//
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/backfill-legacy-originals.mjs           # dry run
//   node scripts/backfill-legacy-originals.mjs --apply   # perform the copy
//
// Only submissions with original_path IS NULL are touched. If a write fails
// after Storage upload, the script preserves the bytes and prints their path
// for host reconciliation; it never removes an original.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apply = process.argv.includes('--apply')

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data: rows, error } = await db
  .from('submissions')
  .select('id, challenge_id, user_id, storage_path, profile:profiles!submissions_user_id_fkey(display_name)')
  .is('original_path', null)
  .order('challenge_id')
if (error) throw error

if (!rows.length) {
  console.log('Nothing to backfill: every submission already has an original.')
  process.exit(0)
}

console.log(`${apply ? 'Backfilling' : 'Dry run:'} ${rows.length} submission(s) without originals.`)

let copied = 0
for (const row of rows) {
  const label = `submission ${row.id} (challenge ${row.challenge_id})`
  const { data: existingVersion, error: existingVersionError } = await db
    .from('original_versions')
    .select('id, original_path, state')
    .eq('game_path', row.storage_path)
    .eq('original_status', 'legacy')
    .is('deleted_at', null)
    .maybeSingle()
  if (existingVersionError) throw existingVersionError

  const versionId = existingVersion?.id ?? randomUUID()
  const originalPath = existingVersion?.original_path ?? `${row.challenge_id}/${row.user_id}/${versionId}.jpg`

  if (!apply) {
    console.log(`  would ${existingVersion ? 'resume' : 'copy'} photos/${row.storage_path} -> photo-originals/${originalPath}`)
    continue
  }

  const { data: blob, error: downloadError } = await db.storage.from('photos').download(row.storage_path)
  if (downloadError || !blob) {
    console.error(`  SKIP ${label}: game copy download failed (${downloadError?.message ?? 'no data'})`)
    continue
  }

  if (!existingVersion) {
    const { error: ledgerError } = await db.from('original_versions').insert({
      id: versionId,
      submission_id: row.id,
      challenge_id: row.challenge_id,
      user_id: row.user_id,
      owner_name_at_upload: row.profile?.display_name ?? 'guest',
      original_path: originalPath,
      game_path: row.storage_path,
      game_bytes: blob.size,
      original_filename: 'legacy-game-copy.jpg',
      original_mime: 'image/jpeg',
      original_bytes: blob.size,
      original_status: 'legacy',
      state: 'pending',
    })
    if (ledgerError) {
      console.error(`  FAIL ${label}: archive ledger reservation failed (${ledgerError.message}); no object uploaded`)
      continue
    }
  }

  if (existingVersion?.state !== 'ready') {
    const { data: storedOriginal } = await db.storage.from('photo-originals').download(originalPath)
    if (!storedOriginal) {
      const { error: uploadError } = await db.storage
        .from('photo-originals')
        .upload(originalPath, blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) {
        console.error(`  SKIP ${label}: original upload failed (${uploadError.message}); pending ledger row retained`)
        continue
      }
    }
  }

  if (existingVersion?.state !== 'ready') {
    const { error: readyError } = await db.from('original_versions').update({
      state: 'ready',
      activated_at: new Date().toISOString(),
    }).eq('id', versionId)
    if (readyError) {
      console.error(`  FAIL ${label}: ledger activation failed (${readyError.message}); stored bytes remain visible as a recovery copy`)
      continue
    }
  }

  const { error: updateError } = await db.rpc('attach_legacy_original', {
    selected_version_id: versionId,
    selected_submission_id: row.id,
  })
  if (updateError) {
    console.error(`  FAIL ${label}: row update failed (${updateError.message}); archived original remains exportable`)
    continue
  }

  copied += 1
  console.log(`  ${existingVersion ? 'resumed' : 'copied'} ${label} (${Math.round(blob.size / 1024)} KB)`)
}

if (apply) console.log(`Done: ${copied}/${rows.length} legacy originals recorded.`)
else console.log('Dry run complete. Re-run with --apply to perform the copy.')
