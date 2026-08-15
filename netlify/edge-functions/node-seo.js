const SUPABASE_URL = 'https://sznohntrlyynbhdigdgb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Qv7L9k8PD2zN1LKuXXHzMQ_FfGDR_e4'
const PROJECT_ID = 'ftc-main'
const SITE_ORIGIN = 'https://ftcprogrammingatlas.com'
const DEFAULT_IMAGE =
  `${SITE_ORIGIN}/img/FTCProgrammingAtlasLogo.png`

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'node'
}

function plainText(value) {
  return String(value || '')
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ' '
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ' '
    )
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value, maxLength = 158) {
  const text = plainText(value)

  if (text.length <= maxLength) {
    return text
  }

  const shortened = text.slice(0, maxLength - 1)
  const lastSpace = shortened.lastIndexOf(' ')

  return `${
    (
      lastSpace > 90
        ? shortened.slice(0, lastSpace)
        : shortened
    ).trim()
  }…`
}

function escapeHtmlAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function replaceMeta(html, matcher, replacement) {
  if (matcher.test(html)) {
    return html.replace(matcher, replacement)
  }

  return html.replace(
    '</head>',
    `  ${replacement}\n</head>`
  )
}

function translationMap(rows) {
  const map = new Map()

  for (const row of rows || []) {
    map.set(row.field_name, row)
  }

  return map
}

function applyNodeMetadata(html, node, translations = []) {
  const translated = translationMap(translations)

  const englishTitle =
    plainText(translated.get('title')?.value) ||
    plainText(node.title) ||
    'FTC Programming'

  const englishContent =
    translated.get('content')?.value || ''

  // Keep the canonical slug tied to the original node title.
  // The numeric id remains the stable route identity.
  const slug = slugify(node.title)
  const canonicalUrl =
    `${SITE_ORIGIN}/node/${node.id}/${slug}`

  const titleText =
    `${englishTitle} | FTC Programming Atlas`

  const descriptionText =
    truncate(englishContent) ||
    `FTC programming documentation for ${englishTitle} in FTC Programming Atlas.`

  const title = escapeHtmlText(titleText)
  const description =
    escapeHtmlAttribute(descriptionText)
  const canonical =
    escapeHtmlAttribute(canonicalUrl)
  const image =
    escapeHtmlAttribute(DEFAULT_IMAGE)

  html = html.replace(
    /<html\b([^>]*)\blang=["'][^"']*["']([^>]*)>/i,
    '<html$1lang="en"$2>'
  )

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${title}</title>`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${description}" />`
  )

  html = replaceMeta(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonical}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    '<meta property="og:type" content="article" />'
  )

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:locale["'][^>]*>/i,
    '<meta property="og:locale" content="en_US" />'
  )

  if (
    !/<meta\s+property=["']og:locale:alternate["'][^>]*>/i.test(
      html
    )
  ) {
    html = html.replace(
      /<meta\s+property=["']og:locale["'][^>]*>/i,
      (match) =>
        `${match}\n  <meta property="og:locale:alternate" content="ro_RO" />`
    )
  }

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${
      escapeHtmlAttribute(titleText)
    }" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${description}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonical}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${image}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${
      escapeHtmlAttribute(titleText)
    }" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${description}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${image}" />`
  )

  return { html, canonicalUrl }
}

async function fetchNode(nodeId) {
  const query = new URL(
    `${SUPABASE_URL}/rest/v1/atlas_nodes`
  )

  query.searchParams.set(
    'select',
    'id,title,content,content_format'
  )
  query.searchParams.set(
    'project_id',
    `eq.${PROJECT_ID}`
  )
  query.searchParams.set(
    'id',
    `eq.${nodeId}`
  )
  query.searchParams.set('limit', '1')

  const response = await fetch(query, {
    headers: {
      apikey: SUPABASE_KEY,
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(
      `Supabase node lookup failed with HTTP ${response.status}`
    )
  }

  const rows = await response.json()

  return Array.isArray(rows)
    ? rows[0] || null
    : null
}

async function fetchEnglishTranslations(nodeId) {
  const query = new URL(
    `${SUPABASE_URL}/rest/v1/atlas_translations`
  )

  query.searchParams.set(
    'select',
    'field_name,value,content_format'
  )
  query.searchParams.set(
    'project_id',
    `eq.${PROJECT_ID}`
  )
  query.searchParams.set(
    'entity_type',
    'eq.node'
  )
  query.searchParams.set(
    'entity_id',
    `eq.${nodeId}`
  )
  query.searchParams.set(
    'language',
    'eq.en'
  )
  query.searchParams.set(
    'field_name',
    'in.(title,content)'
  )

  try {
    const response = await fetch(query, {
      headers: {
        apikey: SUPABASE_KEY,
        accept: 'application/json'
      }
    })

    if (!response.ok) {
      return []
    }

    const rows = await response.json()

    return Array.isArray(rows) ? rows : []
  } catch {
    // SEO must never make the actual node unavailable.
    return []
  }
}

export default async function handler(
  request,
  context
) {
  if (
    request.method !== 'GET' &&
    request.method !== 'HEAD'
  ) {
    return context.next()
  }

  const url = new URL(request.url)
  const match = url.pathname.match(
    /^\/node\/(\d+)(?:\/[^/?#]*)?\/?$/
  )

  if (!match) {
    return context.next()
  }

  const nodeId = Number(match[1])

  if (
    !Number.isSafeInteger(nodeId) ||
    nodeId <= 0
  ) {
    return context.next()
  }

  const [node, translations] =
    await Promise.all([
      fetchNode(nodeId),
      fetchEnglishTranslations(nodeId)
    ])

  if (!node) {
    return context.next()
  }

  const originResponse = await context.next()
  const contentType =
    originResponse.headers.get('content-type') || ''

  if (!contentType.includes('text/html')) {
    return originResponse
  }

  const originalHtml =
    await originResponse.text()

  const { html, canonicalUrl } =
    applyNodeMetadata(
      originalHtml,
      node,
      translations
    )

  const headers =
    new Headers(originResponse.headers)

  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.set(
    'content-type',
    'text/html; charset=utf-8'
  )
  headers.set(
    'x-atlas-seo',
    'node-edge-v52-global-en'
  )
  headers.set(
    'link',
    `<${canonicalUrl}>; rel="canonical"`
  )

  return new Response(
    request.method === 'HEAD'
      ? null
      : html,
    {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers
    }
  )
}

export const config = {
  path: '/node/*',
  onError: 'bypass'
}
