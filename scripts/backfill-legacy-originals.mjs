#!/usr/bin/env node
// One-time backfill: adopt pre-archive game JPEGs as "legacy" originals.
//
// Submissions created before migration 006 only have a 2400px-or-smaller game
// copy in the photos bucket. This script copies that JPEG into the private
// photo-originals bucket and records it on the submission with
// original_status = 'legacy', so it appears in the Photo Export Runbook ZIP.
// The copies are NOT full-resolution captures — 'legacy' marks exactly that.
//
// Requires the service-role key (bypasses RLS); never commit it.
//
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/backfill-legacy-originals.mjs           # dry run
//   node scripts/backfill-legacy-originals.mjs --apply   # perform the copy
//
// Safe to re-run: only submissions with original_path IS NULL are touched.

import { createClient } from '@supabase/supabase-js'

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
  .select('id, challenge_id, user_id, storage_path')
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
  const originalPath = `${row.challenge_id}/${row.user_id}/${Date.now()}-legacy.jpg`
  const label = `submission ${row.id} (challenge ${row.challenge_id})`

  if (!apply) {
    console.log(`  would copy photos/${row.storage_path} -> photo-originals/${originalPath}`)
    continue
  }

  const { data: blob, error: downloadError } = await db.storage.from('photos').download(row.storage_path)
  if (downloadError || !blob) {
    console.error(`  SKIP ${label}: game copy download failed (${downloadError?.message ?? 'no data'})`)
    continue
  }

  const { error: uploadError } = await db.storage
    .from('photo-originals')
    .upload(originalPath, blob, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) {
    console.error(`  SKIP ${label}: original upload failed (${uploadError.message})`)
    continue
  }

  const { error: updateError } = await db
    .from('submissions')
    .update({
      original_path: originalPath,
      original_filename: 'legacy-game-copy.jpg',
      original_mime: 'image/jpeg',
      original_bytes: blob.size,
      original_status: 'legacy',
    })
    .eq('id', row.id)
    .is('original_path', null)
  if (updateError) {
    console.error(`  FAIL ${label}: row update failed (${updateError.message}); removing copied object`)
    await db.storage.from('photo-originals').remove([originalPath])
    continue
  }

  copied += 1
  console.log(`  copied ${label} (${Math.round(blob.size / 1024)} KB)`)
}

if (apply) console.log(`Done: ${copied}/${rows.length} legacy originals recorded.`)
else console.log('Dry run complete. Re-run with --apply to perform the copy.')
