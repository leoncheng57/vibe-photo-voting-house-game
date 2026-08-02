-- Migration 001 created its fixed-path check without an explicit name, so
-- PostgreSQL named it submissions_check. Migration 009 tried to drop a
-- different name, leaving the legacy rule active beside the versioned rule.
alter table public.submissions
  drop constraint if exists submissions_check;
