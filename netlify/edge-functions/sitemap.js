const SUPABASE_URL = 'https://sznohntrlyynbhdigdgb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Qv7L9k8PD2zN1LKuXXHzMQ_FfGDR_e4'
const PROJECT_ID = 'ftc-main'
const SITE_ORIGIN = 'https://ftcprogrammingatlas.com'

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'node'
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function fetchNodes() {
  const query = new URL(`${SUPABASE_URL}/rest/v1/atlas_nodes`)
  query.searchParams.set('select', 'id,title')
  query.searchParams.set('project_id', `eq.${PROJECT_ID}`)
  query.searchParams.set('order', 'id.asc')

  const response = await fetch(query, {
    headers: {
      apikey: SUPABASE_KEY,
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Supabase sitemap lookup failed with HTTP ${response.status}`)
  }

  const rows = await response.json()
  return Array.isArray(rows) ? rows : []
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { allow: 'GET, HEAD' }
    })
  }

  const nodes = await fetchNodes()
  const urls = [
    `${SITE_ORIGIN}/`,
    ...nodes
      .filter((node) => Number.isSafeInteger(Number(node.id)) && Number(node.id) > 0)
      .map((node) => `${SITE_ORIGIN}/node/${Number(node.id)}/${slugify(node.title)}`)
  ]

  const entries = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`

  return new Response(request.method === 'HEAD' ? null : xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'x-atlas-seo': 'dynamic-sitemap-v49'
    }
  })
}

export const config = {
  path: '/sitemap.xml',
  onError: 'bypass'
}
