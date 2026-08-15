const I18N_SCRIPT = '/js/atlas-i18n.js?v=52'
const MARKER = 'data-atlas-i18n="v52"'

const HOME_TITLE =
  'FTC Programming Atlas | FTC Robotics Programming Guide'

const HOME_DESCRIPTION =
  'Interactive FTC programming guide for FTC SDK, Pedro Pathing, Road Runner, FTCLib, control loops, vision, autonomous programming, and debugging.'

function replaceMeta(html, matcher, replacement) {
  if (matcher.test(html)) {
    return html.replace(matcher, replacement)
  }

  return html.replace(
    '</head>',
    `  ${replacement}\n</head>`
  )
}

function applyEnglishHomepageMetadata(html) {
  html = html.replace(
    /<html\b([^>]*)\blang=["'][^"']*["']([^>]*)>/i,
    '<html$1lang="en"$2>'
  )

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${HOME_TITLE}</title>`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${HOME_DESCRIPTION}" />`
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
    `<meta property="og:title" content="${HOME_TITLE}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${HOME_DESCRIPTION}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${HOME_TITLE}" />`
  )

  html = replaceMeta(
    html,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${HOME_DESCRIPTION}" />`
  )

  return html
}

export default async function handler(request, context) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return context.next()
  }

  const response = await context.next()

  if (request.method === 'HEAD') {
    return response
  }

  const contentType =
    response.headers.get('content-type') || ''

  if (!contentType.includes('text/html')) {
    return response
  }

  const url = new URL(request.url)
  let html = await response.text()

  if (
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    html = applyEnglishHomepageMetadata(html)
  }

  if (!html.includes(MARKER)) {
    const scriptTag =
      `<script type="module" src="${I18N_SCRIPT}" ${MARKER}></script>`

    if (/<\/body>/i.test(html)) {
      html = html.replace(
        /<\/body>/i,
        `  ${scriptTag}\n</body>`
      )
    } else {
      html += `\n${scriptTag}\n`
    }
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.set(
    'content-type',
    'text/html; charset=utf-8'
  )
  headers.set(
    'x-atlas-i18n',
    'bilingual-v52-global-en'
  )

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export const config = {
  path: ['/', '/index.html', '/node/*'],
  onError: 'bypass'
}
