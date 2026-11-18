import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../js/atlas-script.js', import.meta.url), 'utf8')
function sliceFunctions(first, after) {
  const start = source.indexOf(`function ${first}(`)
  const end = source.indexOf(`function ${after}(`, start)
  assert.ok(start >= 0 && end > start, `Missing navigation code: ${first}`)
  return source.slice(start, end)
}

function navigationFixture(role = 'team_leader') {
  const preferences = new Map([['department', 'universal']])
  const context = {
    activeDepartmentScope: null, activeDepartmentId: null, activeTeamId: 1, activePublicSection: 'global',
    CACHE_KEYS: { department: 'department' },
    localStorage: { getItem: key => preferences.get(key), setItem: (key, value) => preferences.set(key, value) },
    departments: [
      { id: 1, slug: 'universal' }, { id: 2, slug: 'programming' }, { id: 3, slug: 'cad-mechanical' },
      { id: 4, slug: 'fundraising' }, { id: 5, slug: 'public-relations' }
    ],
    publicNodes: [{ departmentIds: [1] }, { departmentIds: [2] }],
    roadmaps: [],
    currentTeamDepartmentIds: () => [1, 2, 3, 4, 5],
    effectiveCurrentTeamRole: () => role,
    effectiveAssignedDepartmentIds: () => [2, 3],
    nodeDepartmentIds: node => node.departmentIds,
    getDepartmentById: id => context.departments.find(item => item.id === id),
    detailOpen: false,
    clearFiltersForDeepLink() {},
    renderMapNavigationState() {},
    departmentTabs: { querySelector: () => null },
    requestAnimationFrame() {},
    fitView() {}
  }
  runInNewContext([
    sliceFunctions('readableTeamDepartmentIds', 'teamAtlasRoleCanEdit'),
    sliceFunctions('currentViewDepartments', 'renderDepartmentNavigation')
  ].join('\n'), context)
  return context
}

test('the team opens on Programming despite a legacy Universal choice and lists all enabled departments', () => {
  const nav = navigationFixture()
  nav.activePublicSection = 'team'
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 2)
  assert.equal(nav.currentViewDepartments().map(item => item.id).join(), '1,2,3,4,5')
})

test('Global and each team remember separate departments, shared between Explore and Roadmaps', () => {
  const nav = navigationFixture()
  nav.normalizeDepartmentState()
  nav.selectDepartment(1)
  nav.activePublicSection = 'team'
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 2)
  nav.selectDepartment(3)
  nav.activePublicSection = 'team-roadmaps'
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 3)
  nav.activePublicSection = 'global-roadmaps'
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 1)
  nav.activePublicSection = 'team'
  nav.activeTeamId = 2
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 2)
  nav.activeTeamId = 1
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 3)
})

test('members see only assigned team departments and cannot select another', () => {
  const nav = navigationFixture('team_member')
  nav.activePublicSection = 'team'
  nav.normalizeDepartmentState()
  assert.equal(nav.currentViewDepartments().map(item => item.id).join(), '2,3')
  nav.selectDepartment(1)
  assert.equal(nav.activeDepartmentId, 2)
})

test('a direct node route selects its department before rendering, without changing the saved choice', () => {
  const nav = navigationFixture()
  nav.normalizeDepartmentState()
  nav.selectDepartment(1)
  nav.activePublicSection = 'team'
  nav.activateDepartmentForNode({ departmentIds: [3] })
  nav.normalizeDepartmentState()
  assert.equal(nav.activeDepartmentId, 3)
  assert.equal(nav.localStorage.getItem('department:team-1'), undefined)
  assert.equal(nav.localStorage.getItem('department:global'), 'universal')
})
