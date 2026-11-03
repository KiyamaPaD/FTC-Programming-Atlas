// Personal reading state. A node has one checkbox, shared by every roadmap.
// Scope generations prevent a late response from changing another account/team.
export function createNodeReadStore({ client, projectId, onChange = () => {} }) {
  let scope = null
  let generation = 0
  let reads = new Set()
  let pending = new Set()
  let phase = 'idle'
  let error = null
  let loading = null

  const validId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0
  const notify = (kind, nodeId = null) => onChange({ kind, nodeId })
  const scoped = (query, context) => query.eq('project_id', projectId).eq('team_id', context.teamId).eq('user_id', context.userId)

  const store = {
    get ready() { return phase === 'ready' },
    get loading() { return phase === 'loading' },
    get error() { return error },
    ids: () => [...reads],
    has: (nodeId) => reads.has(Number(nodeId)),
    busy: (nodeId) => pending.has(Number(nodeId)),

    reset(context = null, cachedIds = []) {
      generation += 1
      scope = context?.userId && validId(context.teamId)
        ? { userId: context.userId, teamId: Number(context.teamId) }
        : null
      reads = new Set(scope && Array.isArray(cachedIds) ? cachedIds.filter(validId).map(Number) : [])
      pending = new Set()
      phase = 'idle'
      error = null
      loading = null
    },

    async load() {
      if (!scope) return false
      if (loading) return loading
      const context = scope
      const requestGeneration = generation
      phase = 'loading'
      error = null
      notify('loading')

      loading = (async () => {
        try {
          const ids = []
          for (let offset = 0; ; offset += 1000) {
            const result = await scoped(client.from('atlas_team_node_reads').select('node_id'), context)
              .order('node_id', { ascending: true }).range(offset, offset + 999)
            if (requestGeneration !== generation) return false
            if (result.error) throw result.error
            const rows = result.data || []
            ids.push(...rows.map((row) => Number(row.node_id)).filter(validId))
            if (rows.length < 1000) break
          }
          reads = new Set(ids)
          phase = 'ready'
          notify('loaded')
          return true
        } catch (cause) {
          if (requestGeneration !== generation) return false
          phase = 'error'
          error = 'load'
          notify('error')
          throw cause
        } finally {
          if (requestGeneration === generation) loading = null
        }
      })()
      return loading
    },

    async setRead(nodeId, value) {
      const id = Number(nodeId)
      if (!scope || !store.ready || !validId(id) || typeof value !== 'boolean') return false
      if (pending.has(id) || reads.has(id) === value) return false
      const context = scope
      const requestGeneration = generation
      pending.add(id)
      error = null
      notify('saving', id)

      try {
        const table = client.from('atlas_team_node_reads')
        const result = value
          ? await table.upsert({ project_id: projectId, team_id: context.teamId, user_id: context.userId, node_id: id }, { onConflict: 'project_id,team_id,user_id,node_id', ignoreDuplicates: true })
          : await scoped(table.delete(), context).eq('node_id', id)
        if (result.error) throw result.error
        if (requestGeneration !== generation) return false
        if (value) reads.add(id)
        else reads.delete(id)
        notify('changed', id)
        return true
      } catch (cause) {
        if (requestGeneration !== generation) return false
        error = 'save'
        throw cause
      } finally {
        if (requestGeneration === generation) {
          pending.delete(id)
          notify('settled', id)
        }
      }
    }
  }
  return store
}
