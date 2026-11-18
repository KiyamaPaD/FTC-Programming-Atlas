const SURFACE = '[data-atlas-math-content]'
const SKIP = 'pre, code, kbd, samp, script, style, textarea, [contenteditable], .atlas-formula, [data-atlas-embed], a'
const DELIMITERS = [
  { open: '\\(', close: '\\)', display: false },
  { open: '\\[', close: '\\]', display: true },
  { open: '$$', close: '$$', display: true }
]
const MAX_SOURCE_LENGTH = 2400
let engine

function isEscaped(text, index) {
  let precedingBackslashes = 0
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) precedingBackslashes++
  return precedingBackslashes % 2 === 1
}

export function splitAtlasMath(text) {
  const parts = []
  let textStart = 0
  for (let i = 0; i < text.length - 1; i++) {
    const delimiter = DELIMITERS.find(item => text.startsWith(item.open, i))
    if (!delimiter || isEscaped(text, i)) continue
    const start = i + delimiter.open.length
    let end = text.indexOf(delimiter.close, start)
    while (end >= 0 && isEscaped(text, end)) end = text.indexOf(delimiter.close, end + 1)
    if (end < 0) continue
    const tex = text.slice(start, end).trim()
    if (!tex || tex.length > MAX_SOURCE_LENGTH) continue
    if (i > textStart) parts.push({ text: text.slice(textStart, i) })
    parts.push({ tex, display: delimiter.display })
    textStart = end + delimiter.close.length
    i = textStart - 1
  }
  if (textStart < text.length) parts.push({ text: text.slice(textStart) })
  return parts
}

function renderFormula(element, part, copyText, english) {
  const doc = element.ownerDocument
  const formula = doc.createElement('span')
  formula.className = part.display ? 'atlas-formula atlas-formula-block' : 'atlas-formula'
  const math = doc.createElement('span')
  math.className = 'atlas-formula-value'
  math.textContent = part.tex
  const button = doc.createElement('button')
  button.type = 'button'
  button.className = 'atlas-formula-copy'
  button.title = english ? 'Copy LaTeX' : 'Copiază LaTeX'
  button.setAttribute('aria-label', button.title)
  button.textContent = 'TeX'
  const status = doc.createElement('span')
  status.className = 'atlas-formula-status'
  status.setAttribute('aria-live', 'polite')
  const source = doc.createElement('textarea')
  source.readOnly = true
  source.hidden = true
  source.value = part.tex
  source.setAttribute('aria-label', english ? 'LaTeX source' : 'Sursa LaTeX')
  button.addEventListener('click', async () => {
    try {
      await copyText(part.tex)
      button.textContent = '✓'
      status.textContent = english ? 'LaTeX copied' : 'LaTeX copiat'
      setTimeout(() => { button.textContent = 'TeX'; status.textContent = '' }, 1600)
    } catch {
      source.hidden = false
      source.focus()
      source.select()
      status.textContent = english ? 'Select and copy the LaTeX source' : 'Copiază codul LaTeX selectat'
    }
  })
  formula.append(math, button, status, source)
  return { formula, math, part }
}

export async function renderAtlasTex(tex, element, displayMode = false) {
  engine ||= import('./vendor/katex-0.19.1/katex.mjs').catch(error => {
    engine = undefined
    throw error
  })
  const { render } = await engine
  render(tex, element, {
    displayMode,
    trust: false,
    strict: 'error',
    throwOnError: true,
    maxExpand: 256,
    maxSize: 12
  })
}

export async function hydrateAtlasMath(root, copyText) {
  if (!root) return
  const surfaces = root.matches?.(SURFACE) ? [root] : root.querySelectorAll(SURFACE)
  const pending = []
  for (const surface of surfaces) {
    const doc = surface.ownerDocument
    const english = doc.documentElement.lang === 'en'
    const walker = doc.createTreeWalker(surface, NodeFilter.SHOW_TEXT)
    const replacements = []
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (node.parentElement?.closest(SKIP)) continue
      const parts = splitAtlasMath(node.data)
      if (parts.some(part => part.tex)) replacements.push([node, parts])
    }
    for (const [node, parts] of replacements) {
      const fragment = doc.createDocumentFragment()
      for (const part of parts) {
        if (!part.tex) {
          fragment.append(part.text)
          continue
        }
        const item = renderFormula(surface, part, copyText, english)
        pending.push(item)
        fragment.append(item.formula)
      }
      node.replaceWith(fragment)
    }
  }
  await Promise.all(pending.map(async ({ math, part }) => {
    if (!math.isConnected) return
    try {
      await renderAtlasTex(part.tex, math, part.display)
    } catch {
      math.textContent = part.tex
      math.classList.add('atlas-formula-source')
    }
  }))
}
