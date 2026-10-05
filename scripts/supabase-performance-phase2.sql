-- FTC Programming Atlas
-- Phase 2 · Supabase query/index audit
-- Generated from the actual v119 query patterns in js/atlas-script.js.
--
-- Goals:
--   1. Speed up Team Atlas bootstrap scans.
--   2. Speed up per-node lazy attachment loads.
--   3. Speed up team/account context lookups.
--   4. Keep this rerunnable and conservative.
--
-- Important:
--   Quick Find uses leading-wildcard ILIKE (%term%). B-tree indexes below help
--   narrow rows by project/team, but they do NOT index substring text search.
--   pg_trgm/GIN is intentionally NOT enabled here; add it only after measuring
--   Quick Find on real production data.

-- ---------------------------------------------------------------------------
-- A. Inspect current indexes first
-- ---------------------------------------------------------------------------

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'atlas_team_nodes',
    'atlas_team_edges',
    'atlas_team_node_code_snippets',
    'atlas_team_node_media',
    'atlas_team_node_files',
    'atlas_team_roadmaps',
    'atlas_team_roadmap_steps',
    'atlas_team_roadmap_progress',
    'atlas_document_references',
    'atlas_document_review_state',
    'atlas_team_memberships',
    'atlas_team_invites',
    'atlas_team_member_departments',
    'atlas_team_departments'
  )
order by tablename, indexname;

-- ---------------------------------------------------------------------------
-- B. Conservative indexes matching actual frontend filters/order clauses
-- ---------------------------------------------------------------------------

-- Team Atlas map bootstrap:
-- WHERE project_id = ? AND team_id = ? ORDER BY id
create index if not exists atlas_perf_team_nodes_bootstrap_idx
  on public.atlas_team_nodes (project_id, team_id, id);

-- Team edges:
-- WHERE project_id = ? AND team_id = ? ORDER BY source_id, target_id
create index if not exists atlas_perf_team_edges_bootstrap_idx
  on public.atlas_team_edges (project_id, team_id, source_id, target_id);

-- Lazy node attachments:
-- WHERE project_id = ? AND team_id = ? AND node_id = ?
-- ORDER BY sort_order, id
create index if not exists atlas_perf_team_code_node_idx
  on public.atlas_team_node_code_snippets
  (project_id, team_id, node_id, sort_order, id);

create index if not exists atlas_perf_team_media_node_idx
  on public.atlas_team_node_media
  (project_id, team_id, node_id, sort_order, id);

create index if not exists atlas_perf_team_files_node_idx
  on public.atlas_team_node_files
  (project_id, team_id, node_id, sort_order, id);

-- Team roadmaps:
-- bootstrap ORDER BY sort_order/title and roadmap steps ORDER BY roadmap/position
create index if not exists atlas_perf_team_roadmaps_idx
  on public.atlas_team_roadmaps
  (project_id, team_id, sort_order, title);

create index if not exists atlas_perf_team_roadmap_steps_idx
  on public.atlas_team_roadmap_steps
  (project_id, team_id, roadmap_id, position);

-- Per-user roadmap progress:
-- WHERE project_id/team_id/user_id and mutations also identify roadmap/node
create index if not exists atlas_perf_team_roadmap_progress_idx
  on public.atlas_team_roadmap_progress
  (project_id, team_id, user_id, roadmap_id, node_id);

-- Documentation metadata loaded with Team Atlas:
create index if not exists atlas_perf_document_references_team_idx
  on public.atlas_document_references
  (project_id, node_scope, team_id, team_node_id, sort_order, id);

create index if not exists atlas_perf_document_review_team_idx
  on public.atlas_document_review_state
  (project_id, node_scope, team_id, team_node_id);

-- Team/account context:
-- own memberships: project_id + user_id + status
create index if not exists atlas_perf_team_memberships_user_idx
  on public.atlas_team_memberships
  (project_id, user_id, status);

-- member lists: project_id + team_id
create index if not exists atlas_perf_team_memberships_team_idx
  on public.atlas_team_memberships
  (project_id, team_id);

-- pending invite lookup by signed-in email
create index if not exists atlas_perf_team_invites_email_idx
  on public.atlas_team_invites
  (project_id, email, status, expires_at);

-- invite manager list by team, newest first
create index if not exists atlas_perf_team_invites_team_idx
  on public.atlas_team_invites
  (project_id, team_id, created_at desc);

-- member department joins used when loading the team drawer/context
create index if not exists atlas_perf_team_member_departments_idx
  on public.atlas_team_member_departments
  (project_id, team_id, membership_id, department_id);

create index if not exists atlas_perf_team_departments_idx
  on public.atlas_team_departments
  (project_id, team_id, department_id);

-- ---------------------------------------------------------------------------
-- C. Refresh planner statistics for the touched tables
-- ---------------------------------------------------------------------------

analyze public.atlas_team_nodes;
analyze public.atlas_team_edges;
analyze public.atlas_team_node_code_snippets;
analyze public.atlas_team_node_media;
analyze public.atlas_team_node_files;
analyze public.atlas_team_roadmaps;
analyze public.atlas_team_roadmap_steps;
analyze public.atlas_team_roadmap_progress;
analyze public.atlas_document_references;
analyze public.atlas_document_review_state;
analyze public.atlas_team_memberships;
analyze public.atlas_team_invites;
analyze public.atlas_team_member_departments;
analyze public.atlas_team_departments;

-- ---------------------------------------------------------------------------
-- D. Post-run verification
-- ---------------------------------------------------------------------------

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname like 'atlas_perf_%'
order by tablename, indexname;

-- Quick Find note:
-- Current v119 path filters server-side using ILIKE '%term%' across content,
-- code, media and file metadata while returning only lightweight columns.
-- If production measurements later show Quick Find as the remaining bottleneck,
-- evaluate pg_trgm + GIN indexes or a dedicated search RPC/search vector.
