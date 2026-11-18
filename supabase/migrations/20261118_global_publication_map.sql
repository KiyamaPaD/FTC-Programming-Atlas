-- Private provenance ledger: publication jobs only; no browser write access.
create table if not exists public.atlas_global_publication_map (
  project_id text not null,
  source_team_id bigint not null references public.atlas_teams(id),
  entity_kind text not null check (entity_kind in ('node','code','media','edge','roadmap','step')),
  source_id bigint not null,
  public_id bigint not null,
  published_at timestamptz not null default now(),
  primary key (project_id, source_team_id, entity_kind, source_id),
  unique (project_id, entity_kind, public_id)
);
alter table public.atlas_global_publication_map enable row level security;
revoke all on public.atlas_global_publication_map from anon, authenticated;
grant all on public.atlas_global_publication_map to service_role;
comment on table public.atlas_global_publication_map is 'InfotronX publication provenance. Source team records and user read progress remain private and unchanged.';
