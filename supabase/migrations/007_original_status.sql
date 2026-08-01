-- Precise archive provenance for original photos.
--
-- The boolean original_reduced could not distinguish HOW an archive differs
-- from the capture (format conversion, recompression, downscaling) or mark
-- legacy adoptions of pre-archive game copies. Replace it with a status enum
-- plus the source file's size and MIME type:
--
--   exact      byte-for-byte copy of the selected file
--   optimized  full resolution, re-encoded (converted and/or recompressed)
--   resized    dimensions reduced to fit the archive limit
--   legacy     pre-archive submission whose game JPEG was adopted as the
--              best available original by scripts/backfill-legacy-originals.mjs

alter table public.submissions
  add column original_status text,
  add column original_source_bytes bigint,
  add column original_source_mime text;

-- Rows written before this migration only recorded a boolean; 'optimized' is
-- the accurate ceiling for reduced rows (dimensions were preserved unless the
-- encoder had to downscale, which no existing row required).
update public.submissions
set original_status = case when original_reduced then 'optimized' else 'exact' end
where original_path is not null;

alter table public.submissions
  add constraint submissions_original_status_valid check (
    original_status is null
    or original_status in ('exact', 'optimized', 'resized', 'legacy')
  ),
  add constraint submissions_original_status_presence check (
    (original_path is null) = (original_status is null)
  ),
  add constraint submissions_original_source_bytes_positive check (
    original_source_bytes is null or original_source_bytes > 0
  );

alter table public.submissions
  drop column original_reduced;
