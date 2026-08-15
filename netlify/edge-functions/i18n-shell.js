const I18N_SCRIPT = '/js/atlas-i18n.js?v=51'
const MARKER = 'data-atlas-i18n="v51"'

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

  let html = await response.text()

  if (!html.includes(MARKER)) {
    const scriptTag =
      `<script type="module" src="${I18N_SCRIPT}" ${MARKER}></script>`

    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `  ${scriptTag}\n</body>`)
    } else {
      html += `\n${scriptTag}\n`
    }
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('x-atlas-i18n', 'bilingual-v51')

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
