// Public reading uses public tables only. Team nodes and their read state stay isolated.
export async function publicRows(client, projectId, table, columns = '*') {
  const rows = []
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client.from(table).select(columns)
      .eq('project_id', projectId).order('id').range(start, start + 999)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) return rows
  }
}

export async function loadGlobalIndex(client, projectId) {
  const names = ['atlas_nodes', 'atlas_edges', 'atlas_roadmaps', 'atlas_roadmap_steps',
    'atlas_categories', 'atlas_difficulties']
  const results = await Promise.all(names.map(name => publicRows(client, projectId, name,
    name === 'atlas_nodes' ? 'id,title,tag,x,y,width,height,category_id,difficulty_id,content_format,created_at,updated_at' : '*')))
  const { data: departments, error } = await client.from('atlas_node_departments')
    .select('node_id,department_id').eq('project_id', projectId)
  if (error) throw error
  const [nodeRows, edges, roadmaps, steps, categories, difficulties] = results
  return {
    categories, difficulties,
    nodes: nodeRows.map(row => ({
      id: Number(row.id), isTeamNode: false, title: row.title || '', legacyTag: row.tag || '',
      categoryId: row.category_id, difficultyId: row.difficulty_id, tagIds: [],
      departmentIds: (departments || []).filter(d => d.node_id === row.id).map(d => Number(d.department_id)),
      x: Number(row.x), y: Number(row.y), width: row.width, height: row.height,
      content: '', contentFormat: row.content_format || 'html', contentLoaded: false,
      attachmentsLoaded: false, contentLoadError: null, codeSnippets: [], media: [], files: [], references: [],
      links: edges.filter(e => e.source_id === row.id).map(e => ({
        targetId: Number(e.target_id), label: e.label || 'relație',
        controlPoints: Array.isArray(e.control_points) ? e.control_points : []
      })),
      createdAt: row.created_at, updatedAt: row.updated_at
    })),
    roadmaps: roadmaps.map(row => ({
      id: Number(row.id), title: row.title, slug: row.slug, description: row.description,
      departmentId: Number(row.department_id), isActive: row.is_active, sortOrder: row.sort_order,
      steps: steps.filter(s => s.roadmap_id === row.id).sort((a,b) => a.position - b.position || a.id - b.id)
        .map(s => ({id: s.id, nodeId: Number(s.node_id), position: s.position, note: s.note, isOptional: s.is_optional}))
    }))
  }
}

export async function loadGlobalDetail(client, projectId, node) {
  const query = table => client.from(table).select('*').eq('project_id', projectId).eq('node_id', node.id).order('sort_order').order('id')
  const results = await Promise.all([
    client.from('atlas_nodes').select('content,content_format,updated_at').eq('project_id', projectId).eq('id', node.id).single(),
    query('atlas_node_code_snippets'), query('atlas_node_media'), query('atlas_node_files')
  ])
  for (const result of results) if (result.error) throw result.error
  const [document, codes, media, files] = results.map(r => r.data)
  const common = r => ({id: Number(r.id), nodeId: node.id, title: r.title || '', description: r.description || '', sortOrder: r.sort_order})
  return {
    content: document.content || '', contentFormat: document.content_format, updatedAt: document.updated_at,
    contentLoaded: true, attachmentsLoaded: true, contentLoadError: null,
    codeSnippets: codes.map(r => ({...common(r), language: r.language, code: r.code})),
    media: media.map(r => ({...common(r), mediaType: r.media_type, storagePath: r.storage_path,
      externalUrl: r.external_url, mimeType: r.mime_type, fileSize: r.file_size, caption: r.caption || ''})),
    files: files.map(r => ({...common(r), storagePath: r.storage_path, originalName: r.original_name,
      relativePath: r.relative_path, mimeType: r.mime_type, fileSize: r.file_size}))
  }
}
