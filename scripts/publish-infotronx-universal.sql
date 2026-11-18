-- Publish the seven reviewed Universal source nodes with their original layout.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
lock table atlas_team_nodes, atlas_team_node_code_snippets, atlas_team_node_media,
  atlas_team_node_files, atlas_team_edges in share mode;
select pg_advisory_xact_lock(hashtext('ftc-main:infotronx-universal'));
do $publish$
declare
  n record;
  asset record;
  edge record;
  target_id bigint;
  mapped_asset_id bigint;
  document text;
  map_count int;
begin
  select count(*) into map_count from atlas_global_publication_map
  where project_id='ftc-main' and source_team_id=1 and entity_kind='node' and source_id between 4 and 10;
  if map_count = 7 then return; end if;
  if map_count <> 0 then raise exception 'Incomplete prior Universal publication'; end if;

  if (select array_agg(md5(content) order by id) from atlas_team_nodes
      where project_id='ftc-main' and team_id=1 and department_id=1)
     is distinct from array[
      'c5ed7aeca9ac4d2c957cf19ba42ee8aa','8410c099a39ff57f4776c2294b9ff99f','a64634fb6b2c23cd52e3384156a82004',
      '849f5478d050bf84329115bb8dd04c1a','b1a8efb9f2ddde9e44ab77eca8691b1a','18e3e3d32f778047341b047a9493ef67',
      'f703ed95a05b04e25fe257918afbfec2'] then
    raise exception 'Universal source documents changed since inspection';
  end if;

  if not exists (select 1 from atlas_nodes where project_id='ftc-main' and id=999030
    and md5(content)='7dea4ca48da2028984e4a8b87b861680') or
    exists (select 1 from atlas_node_media where project_id='ftc-main' and node_id=999030) then
    raise exception 'Existing public introduction changed';
  end if;
  if exists (select 1 from atlas_team_node_files where project_id='ftc-main' and team_id=1 and node_id between 4 and 10)
     or exists (select 1 from atlas_team_node_code_snippets where project_id='ftc-main' and team_id=1 and node_id between 4 and 10)
     or exists (select 1 from atlas_team_node_media where project_id='ftc-main' and team_id=1 and node_id between 4 and 10
        and (storage_path is not null or external_url is null or external_url !~ '^https://(ftc-docs\.firstinspires\.org|www\.youtube\.com)/')) then
    raise exception 'Unexpected Universal attachments';
  end if;

  for n in
    select t.*, c.slug category_slug, d.slug difficulty_slug
    from atlas_team_nodes t
    left join atlas_team_categories c on c.id=t.team_category_id
    left join atlas_team_difficulties d on d.id=t.team_difficulty_id
    where t.project_id='ftc-main' and t.team_id=1 and t.department_id=1 and t.id between 4 and 10
    order by t.id
  loop
    if n.id = 4 then
      target_id := 999030;
      update atlas_nodes set title=n.title,tag=n.tag,x=n.x,y=n.y,width=n.width,height=n.height,
        content_format=n.content_format,
        category_id=(select id from atlas_categories where project_id='ftc-main' and slug=n.category_slug limit 1),
        difficulty_id=(select id from atlas_difficulties where project_id='ftc-main' and slug=n.difficulty_slug limit 1)
      where project_id='ftc-main' and id=target_id;
    else
      insert into atlas_nodes(project_id,title,tag,x,y,width,height,content_format,category_id,difficulty_id)
      values('ftc-main',n.title,n.tag,n.x,n.y,n.width,n.height,n.content_format,
        (select id from atlas_categories where project_id='ftc-main' and slug=n.category_slug limit 1),
        (select id from atlas_difficulties where project_id='ftc-main' and slug=n.difficulty_slug limit 1))
      returning id into target_id;
    end if;
    insert into atlas_node_departments(project_id,node_id,department_id)
      values('ftc-main',target_id,1) on conflict do nothing;
    insert into atlas_global_publication_map(project_id,source_team_id,entity_kind,source_id,public_id)
      values('ftc-main',1,'node',n.id,target_id);

    document := n.content;
    for asset in select * from atlas_team_node_media
      where project_id='ftc-main' and team_id=1 and node_id=n.id order by id
    loop
      insert into atlas_node_media(project_id,node_id,media_type,external_url,mime_type,file_size,title,caption,sort_order)
      values('ftc-main',target_id,asset.media_type,asset.external_url,asset.mime_type,asset.file_size,asset.title,asset.caption,asset.sort_order)
      returning id into mapped_asset_id;
      insert into atlas_global_publication_map(project_id,source_team_id,entity_kind,source_id,public_id)
        values('ftc-main',1,'media',asset.id,mapped_asset_id);
      document := replace(document,format('data-atlas-embed="media" data-atlas-id="%s"',asset.id),
        format('data-atlas-embed="media" data-atlas-id="PUBLIC_%s"',mapped_asset_id));
    end loop;
    if document ~ 'data-atlas-embed="media" data-atlas-id="[0-9]+"' then
      raise exception 'Unmapped Universal attachment at team node %',n.id;
    end if;
    update atlas_nodes set content=replace(document,'data-atlas-id="PUBLIC_','data-atlas-id="')
      where project_id='ftc-main' and id=target_id;
  end loop;

  for edge in select e.*, a.public_id from_public, b.public_id to_public
    from atlas_team_edges e
    join atlas_global_publication_map a on a.project_id=e.project_id and a.source_team_id=e.team_id
      and a.entity_kind='node' and a.source_id=e.source_id
    join atlas_global_publication_map b on b.project_id=e.project_id and b.source_team_id=e.team_id
      and b.entity_kind='node' and b.source_id=e.target_id
    where e.project_id='ftc-main' and e.team_id=1 and e.source_id between 4 and 10 and e.target_id between 4 and 10
  loop
    insert into atlas_edges(project_id,source_id,target_id,label,control_x,control_y,control_points)
      values('ftc-main',edge.from_public,edge.to_public,edge.label,edge.control_x,edge.control_y,edge.control_points)
      returning id into target_id;
    insert into atlas_global_publication_map(project_id,source_team_id,entity_kind,source_id,public_id)
      values('ftc-main',1,'edge',edge.id,target_id);
  end loop;

  if (select count(*) from atlas_node_departments where project_id='ftc-main' and department_id=1) <> 7
     or (select count(*) from atlas_edges e
         join atlas_node_departments a on a.project_id=e.project_id and a.node_id=e.source_id and a.department_id=1
         join atlas_node_departments b on b.project_id=e.project_id and b.node_id=e.target_id and b.department_id=1
         where e.project_id='ftc-main') <> 6
     or (select count(*) from atlas_node_media m join atlas_node_departments d
         on d.project_id=m.project_id and d.node_id=m.node_id and d.department_id=1 where m.project_id='ftc-main') <> 12
  then raise exception 'Unexpected Universal publication counts'; end if;
end $publish$;
set constraints all immediate;
select count(*) as universal_nodes from atlas_node_departments where project_id='ftc-main' and department_id=1;
commit;
