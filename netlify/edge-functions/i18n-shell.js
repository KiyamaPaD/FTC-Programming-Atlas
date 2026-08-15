const I18N_SCRIPT = '/js/atlas-i18n.js?v=53'
const I18N_COVERAGE_SCRIPT = '/js/atlas-i18n-v56.js?v=56'
const MARKER = 'data-atlas-i18n="v56"'

const HOME_TITLE =
  'FTC Programming Atlas | FTC Robotics Programming Guide'

const HOME_DESCRIPTION =
  'Interactive FTC programming guide for FTC SDK, PedroPathing, Road Runner, FTCLib, control loops, vision, debugging, and team documentation.'

const LOGO_URL =
  'https://ftcprogrammingatlas.com/img/FTCProgrammingAtlasLogo.png'

function replaceMeta(html, matcher, replacement) {
  if (matcher.test(html)) {
    return html.replace(matcher, replacement)
  }

  return html.replace(
    '</head>',
    `  ${replacement}\n</head>`
  )
}

function injectJsonLd(html) {
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'FTC Programming Atlas',
        url: 'https://ftcprogrammingatlas.com/',
        logo: LOGO_URL
      },
      {
        '@type': 'WebSite',
        name: 'FTC Programming Atlas',
        url: 'https://ftcprogrammingatlas.com/',
        inLanguage: 'en',
        description: HOME_DESCRIPTION,
        publisher: {
          '@type': 'Organization',
          name: 'FTC Programming Atlas',
          logo: {
            '@type': 'ImageObject',
            url: LOGO_URL
          }
        }
      }
    ]
  }

  const script = `<script type="application/ld+json" data-atlas-schema="v55">${JSON.stringify(payload)}</script>`

  if (/data-atlas-schema="v55"/i.test(html)) {
    return html
  }

  return html.replace('</head>', `  ${script}\n</head>`)
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

  if (!/<meta\s+property=["']og:locale:alternate["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<meta\s+property=["']og:locale["'][^>]*>/i,
      (match) => `${match}\n  <meta property="og:locale:alternate" content="ro_RO" />`
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
    /<meta\s+property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${LOGO_URL}" />`
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

  html = replaceMeta(
    html,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${LOGO_URL}" />`
  )

  html = replaceMeta(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    '<link rel="canonical" href="https://ftcprogrammingatlas.com/" />'
  )

  return injectJsonLd(html)
}

export default async function handler(request, context) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return context.next()
  }

  const response = await context.next()

  if (request.method === 'HEAD') {
    return response
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const url = new URL(request.url)
  let html = await response.text()

  if (url.pathname === '/' || url.pathname === '/index.html') {
    html = applyEnglishHomepageMetadata(html)
  }

  if (!html.includes(MARKER)) {
    const scriptTags = [
      `<script type="module" src="${I18N_SCRIPT}"></script>`,
      `<script type="module" src="${I18N_COVERAGE_SCRIPT}" ${MARKER}></script>`
    ].join('\n  ')

    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `  ${scriptTags}\n</body>`)
    } else {
      html += `\n${scriptTags}\n`
    }
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('x-atlas-i18n', 'bilingual-v56-dynamic-counts')

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
