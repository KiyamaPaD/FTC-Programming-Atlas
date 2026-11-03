import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../js/atlas-node-reads.js', import.meta.url), 'utf8')
const { createNodeReadStore } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const app = await readFile(new URL('../js/atlas-script.js', import.meta.url), 'utf8')

const context = { userId: 'user-a', teamId: 1 }
const row = (node_id, user_id = 'user-a', team_id = 1) => ({ project_id: 'ftc-main', team_id, user_id, node_id })
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r }); return { promise, resolve } }

function database(rows = []) {
  const calls = []
  const gates = []
  const failures = []
  const client = {
    from(table) {
      assert.equal(table, 'atlas_team_node_reads')
      const query = { filters: {}, start: 0, end: Infinity }
      const builder = {
        select() { query.action = 'select'; return this },
        upsert(data, options) { query.action = 'insert'; query.data = data; query.options = options; return this },
        delete() { query.action = 'delete'; return this },
        eq(key, value) { query.filters[key] = value; return this },
        order(key) { query.order = key; return this },
        range(start, end) { query.start = start; query.end = end; return this },
        then(resolve, reject) {
          calls.push(query)
          const gate = gates.shift()
          const failure = failures.shift()
          return Promise.resolve(gate?.promise).then(() => {
            if (failure) return { error: failure }
            const matches = (item) => Object.entries(query.filters).every(([key, value]) => item[key] === value)
            if (query.action === 'select') return { data: rows.filter(matches).sort((a, b) => a.node_id - b.node_id).slice(query.start, query.end + 1), error: null }
            if (query.action === 'insert') {
              assert.equal(query.options.ignoreDuplicates, true)
              assert.equal(query.options.onConflict, 'project_id,team_id,user_id,node_id')
              if (!rows.some((item) => Object.entries(query.data).every(([key, value]) => item[key] === value))) rows.push(query.data)
            } else rows = rows.filter((item) => !matches(item))
            return { data: null, error: null }
          }).then(resolve, reject)
        }
      }
      return builder
    }
  }
  return { client, calls, gates, failures, rows: () => rows }
}

function storeFor(db, onChange) {
  const store = createNodeReadStore({ client: db.client, projectId: 'ftc-main', onChange })
  store.reset(context)
  return store
}

test('loads only the active account/team; paginates beyond 1000 nodes', async () => {
  const db = database([...Array.from({ length: 1001 }, (_, index) => row(index + 1)), row(2000, 'other-user'), row(2001, 'user-a', 2)])
  const store = storeFor(db)
  await store.load()
  assert.equal(store.ids().length, 1001)
  assert.equal(store.has(2000), false)
  assert.equal(store.has(2001), false)
  assert.equal(db.calls.length, 2)
  assert.deepEqual(db.calls[0].filters, { project_id: 'ftc-main', team_id: 1, user_id: 'user-a' })
})

test('read/unread persists across reloads and idempotent writes from another tab', async () => {
  const db = database()
  const first = storeFor(db)
  const second = storeFor(db)
  await Promise.all([first.load(), second.load()])
  await first.setRead(14, true)
  await second.setRead(14, true)
  assert.equal(db.rows().length, 1)
  const reopened = storeFor(db)
  await reopened.load()
  assert.equal(reopened.has(14), true)
  await reopened.setRead(14, false)
  await second.load()
  assert.equal(second.has(14), false)
  assert.equal(db.rows().length, 0)
})

test('double activation sends one request and never shows an unconfirmed read', async () => {
  const db = database()
  const events = []
  const store = storeFor(db, (event) => events.push(event.kind))
  await store.load()
  const gate = deferred()
  db.gates.push(gate)
  const save = store.setRead(60, true)
  assert.equal(store.busy(60), true)
  assert.equal(store.has(60), false)
  assert.equal(await store.setRead(60, true), false)
  gate.resolve()
  assert.equal(await save, true)
  assert.equal(store.busy(60), false)
  assert.equal(store.has(60), true)
  assert.equal(db.calls.filter((call) => call.action === 'insert').length, 1)
  assert.deepEqual(events.slice(-3), ['saving', 'changed', 'settled'])
})

test('failed save keeps the previous checkbox value and permits retry', async () => {
  const db = database([row(60)])
  const store = storeFor(db)
  await store.load()
  db.failures.push(new Error('offline'))
  await assert.rejects(store.setRead(60, false), /offline/)
  assert.equal(store.has(60), true)
  assert.equal(store.busy(60), false)
  assert.equal(store.error, 'save')
  await store.setRead(60, false)
  assert.equal(store.has(60), false)
  assert.equal(store.error, null)
})

test('a late save cannot alter the new team or restore data after logout', async () => {
  for (const nextContext of [null, { userId: 'user-b', teamId: 2 }]) {
    const db = database()
    const store = storeFor(db)
    await store.load()
    const gate = deferred()
    db.gates.push(gate)
    const save = store.setRead(60, true)
    await Promise.resolve()
    store.reset(nextContext)
    gate.resolve()
    assert.equal(await save, false)
    assert.deepEqual(store.ids(), [])
    assert.equal(store.ready, false)
    assert.equal(store.busy(60), false)
    assert.deepEqual(db.rows()[0], row(60))
  }
})

test('a stale load cannot overwrite the new account; failed loading disables writes', async () => {
  const db = database([row(14), row(19, 'user-b', 2)])
  const store = storeFor(db)
  const gate = deferred()
  db.gates.push(gate)
  const oldLoad = store.load()
  await Promise.resolve()
  store.reset({ userId: 'user-b', teamId: 2 })
  await store.load()
  gate.resolve()
  await oldLoad
  assert.deepEqual(store.ids(), [19])
  db.failures.push(new Error('permission denied'))
  await assert.rejects(store.load(), /permission denied/)
  assert.equal(store.ready, false)
  const before = db.calls.length
  assert.equal(await store.setRead(19, false), false)
  assert.equal(db.calls.length, before)
  await store.load()
  assert.equal(store.ready, true)
})

test('cached state stays read-only until verified; malformed cache cannot break loading', async () => {
  const db = database()
  const store = storeFor(db)
  store.reset(context, [14, '19', null, -1, 'bad'])
  assert.deepEqual(store.ids(), [14, 19])
  assert.equal(await store.setRead(14, false), false)
  store.reset(context, { bad: 'cache' })
  await store.load()
  assert.equal(store.ready, true)
})

function appFunctions(first, last) { return app.slice(app.indexOf(first), app.indexOf(last, app.indexOf(first))) }

test('both roadmaps share read counts; unknown steps and another team never count', async () => {
  const db = database()
  const nodeReads = storeFor(db)
  await nodeReads.load()
  const teamNodes = [14, 19].map((id) => ({ id, isTeamNode: true, teamId: 1 }))
  const sandbox = { nodeReads, teamNodes, activeTeamId: 1 }
  vm.createContext(sandbox)
  vm.runInContext(appFunctions('function isTeamNodeRead(', 'function nodeReadStatusText(') + appFunctions('function teamRoadmapProgressStats(', 'function teamRoadmapManagerButton('), sandbox)
  const first = { steps: [{ nodeId: 14 }, { nodeId: 19 }] }
  const second = { steps: [{ nodeId: 14 }, { nodeId: 999 }] }
  await nodeReads.setRead(14, true)
  assert.equal(sandbox.teamRoadmapProgressStats(first).read, 1)
  assert.equal(sandbox.teamRoadmapProgressStats(second).percent, 100)
  assert.equal(sandbox.isTeamNodeRead(teamNodes[0]), true)
  assert.equal(sandbox.isTeamNodeRead({ id: 14, isTeamNode: true, teamId: 2 }), false)
  await nodeReads.setRead(14, false)
  assert.equal(sandbox.teamRoadmapProgressStats(first).read, 0)
  assert.equal(sandbox.teamRoadmapProgressStats(second).read, 0)
})

test('read refresh changes existing inputs without rebuilding the reader or roadmap', async () => {
  const db = database([row(14)])
  const nodeReads = storeFor(db)
  await nodeReads.load()
  const flags = []
  const control = { dataset: { nodeRead: '14' }, setAttribute() {}, closest() { return { classList: { toggle: (...args) => flags.push(args) } } } }
  const sandbox = {
    nodeReads, teamRoadmaps: [],
    document: { querySelectorAll: (selector) => selector === '[data-node-read]' ? [control] : [] },
    renderNodes() {}, renderLinks() {}, saveCachedNodes() {},
    renderDetailPanel() { throw new Error('must preserve the reader DOM and scroll') },
    renderPublicShell() { throw new Error('must preserve expanded roadmaps and focus') },
    nodeReadStatusText: () => ''
  }
  vm.createContext(sandbox)
  vm.runInContext(appFunctions('function refreshNodeReadUI(', 'function visibleTeamRoadmaps('), sandbox)
  sandbox.refreshNodeReadUI({ kind: 'changed' })
  assert.equal(control.checked, true)
  assert.equal(control.disabled, false)
  assert.deepEqual(flags, [['is-read', true], ['is-read', true]])
})

test('pinch zoom does not resize the document; keyboard at scale 1 still does', () => {
  const heights = []
  const sandbox = {
    window: { innerHeight: 800, visualViewport: { scale: 1, height: 800 } },
    document: { documentElement: { style: { setProperty: (key, value) => heights.push(value) } } }
  }
  vm.createContext(sandbox)
  vm.runInContext(appFunctions('function updateAtlasViewportHeight()', 'function keepFocusedEditorFieldVisible('), sandbox)
  sandbox.updateAtlasViewportHeight()
  sandbox.window.visualViewport = { scale: 2, height: 400 }
  sandbox.updateAtlasViewportHeight()
  sandbox.window.visualViewport = { scale: 1, height: 450 }
  sandbox.updateAtlasViewportHeight()
  assert.deepEqual(heights, ['800px', '450px'])
})
