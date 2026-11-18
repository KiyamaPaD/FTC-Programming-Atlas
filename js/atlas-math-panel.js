import { renderAtlasTex, splitAtlasMath } from './atlas-math.js?v=127'

const slot = (name, ro, en, value) => ({ name, ro, en, value })

export const mathPresets = {
  integral: {
    ro: 'Integrală definită', en: 'Definite integral',
    fields: [slot('from', 'Capăt inferior', 'Lower bound', 'a'), slot('to', 'Capăt superior', 'Upper bound', 'b'),
      slot('body', 'Funcție', 'Integrand', 'f(x)'), slot('variable', 'Variabilă', 'Variable', 'x')],
    build: ({ from, to, body, variable }) => String.raw`\int_{${from}}^{${to}} ${body}\,\mathrm{d}{${variable}}`
  },
  antiderivative: {
    ro: 'Integrală nedefinită', en: 'Indefinite integral',
    fields: [slot('body', 'Funcție', 'Integrand', 'f(x)'), slot('variable', 'Variabilă', 'Variable', 'x')],
    build: ({ body, variable }) => String.raw`\int ${body}\,\mathrm{d}{${variable}}`
  },
  derivative: {
    ro: 'Derivată', en: 'Derivative',
    fields: [slot('body', 'Funcție', 'Function', 'f(x)'), slot('variable', 'Variabilă', 'Variable', 'x')],
    build: ({ body, variable }) => String.raw`\frac{\mathrm{d}}{\mathrm{d}{${variable}}}\left(${body}\right)`
  },
  nthDerivative: {
    ro: 'Derivată de ordin n', en: 'Nth derivative',
    fields: [slot('body', 'Funcție', 'Function', 'f(x)'), slot('variable', 'Variabilă', 'Variable', 'x'),
      slot('order', 'Ordin', 'Order', '2')],
    build: ({ body, variable, order }) => String.raw`\frac{\mathrm{d}^{${order}}}{\mathrm{d}{${variable}}^{${order}}}\left(${body}\right)`
  },
  fraction: {
    ro: 'Fracție', en: 'Fraction',
    fields: [slot('top', 'Numărător', 'Numerator', 'a+b'), slot('bottom', 'Numitor', 'Denominator', 'c')],
    build: ({ top, bottom }) => String.raw`\frac{${top}}{${bottom}}`
  },
  root: {
    ro: 'Radical', en: 'Root',
    fields: [slot('body', 'Sub radical', 'Radicand', 'x^2+y^2')],
    build: ({ body }) => String.raw`\sqrt{${body}}`
  },
  sum: {
    ro: 'Sumă', en: 'Sum',
    fields: [slot('from', 'Indice de început', 'Initial index', 'k=1'), slot('to', 'Indice final', 'Final index', 'n'),
      slot('body', 'Termen', 'Term', 'a_k')],
    build: ({ from, to, body }) => String.raw`\sum_{${from}}^{${to}} ${body}`
  },
  limit: {
    ro: 'Limită', en: 'Limit',
    fields: [slot('variable', 'Variabilă', 'Variable', 'x'), slot('target', 'Către', 'Approaches', '0'),
      slot('body', 'Funcție', 'Function', String.raw`\frac{\sin x}{x}`)],
    build: ({ variable, target, body }) => String.raw`\lim_{${variable}\to ${target}} ${body}`
  },
  power: {
    ro: 'Putere', en: 'Power',
    fields: [slot('base', 'Bază', 'Base', 'x'), slot('exponent', 'Exponent', 'Exponent', '2')],
    build: ({ base, exponent }) => String.raw`{${base}}^{${exponent}}`
  },
  index: {
    ro: 'Indice', en: 'Subscript',
    fields: [slot('base', 'Bază', 'Base', 'v'), slot('index', 'Indice', 'Subscript', 'k-1')],
    build: ({ base, index }) => String.raw`{${base}}_{${index}}`
  },
  custom: {
    ro: 'LaTeX liber', en: 'Custom LaTeX',
    fields: [slot('tex', 'Expresie LaTeX', 'LaTeX expression', String.raw`v=\frac{d}{t}`)]
  }
}

function checkBraces(value, label, english) {
  let depth = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\') { i++; continue }
    if (value[i] === '{') depth++
    if (value[i] === '}') depth--
    if (depth < 0) break
  }
  if (depth !== 0) {
    throw new Error(english ? `Unbalanced braces in “${label}”.` : `Acolade neechilibrate în „${label}”.`)
  }
}

export function prepareMathDraft(preset, values, display, english = false) {
  if (!Object.hasOwn(mathPresets, preset)) throw new Error('Unknown math preset')
  const spec = mathPresets[preset]
  const normalized = {}
  for (const field of spec.fields) {
    let value = String(values[field.name] ?? '').trim()
    const label = english ? field.en : field.ro
    if (preset === 'custom') {
      const parts = splitAtlasMath(value)
      // A complete formula copied from Atlas can be pasted into the freeform field.
      if (parts.length === 1 && parts[0].tex) value = parts[0].tex
    }
    if (!value) throw new Error(english ? `Fill in “${label}”.` : `Completează câmpul „${label}”.`)
    if (/\\[()[\]]|\$/.test(value)) {
      throw new Error(english ? 'Enter LaTeX without math delimiters.' : 'Scrie expresia fără delimitatori LaTeX.')
    }
    checkBraces(value, label, english)
    normalized[field.name] = value
  }
  const tex = spec.build ? spec.build(normalized) : normalized.tex
  if (tex.length > 2400) throw new Error(english ? 'The formula is too long.' : 'Formula este prea lungă.')
  return { tex, wrapped: display ? `\\[${tex}\\]` : `\\(${tex}\\)` }
}

export function installMathPanel({ panel, toggle, beforeOpen, insert, copyText }) {
  const doc = panel.ownerDocument
  const byName = name => panel.querySelector(`[data-math-${name}]`)
  const presetSelect = byName('preset')
  const fields = byName('fields')
  const mode = byName('mode')
  const preview = byName('preview')
  const source = byName('source')
  const status = byName('status')
  const insertButton = byName('insert')
  const copyButton = byName('copy')
  const copyAtlasButton = byName('copy-atlas')
  const english = () => doc.documentElement.lang === 'en'
  const label = (ro, en) => english() ? en : ro
  const inputs = new Map()
  let validation = 0
  let validDraft = null
  let initialized = false

  function report(message, error = false) {
    status.textContent = message
    status.classList.toggle('is-error', error)
  }

  function setDraft(draft) {
    validDraft = draft
    for (const button of [insertButton, copyButton, copyAtlasButton]) button.disabled = !draft
  }

  async function refresh() {
    const check = ++validation
    setDraft(null)
    preview.replaceChildren()
    source.value = ''
    report('')
    const display = mode.value === 'block'
    try {
      const values = Object.fromEntries([...inputs].map(([name, input]) => [name, input.value]))
      const draft = prepareMathDraft(presetSelect.value, values, display, english())
      source.value = draft.tex
      const result = doc.createElement('span')
      await renderAtlasTex(draft.tex, result, display)
      if (check !== validation || panel.hidden) return
      preview.append(result)
      setDraft(draft)
    } catch (error) {
      if (check !== validation || panel.hidden) return
      const message = error?.name === 'ParseError'
        ? label('Eroare KaTeX: ', 'KaTeX error: ') + (error.rawMessage || error.message)
        : error instanceof TypeError
          ? label('KaTeX nu s-a putut încărca. Încearcă din nou.', 'KaTeX could not load. Try again.')
          : String(error.message || error)
      report(message, true)
    }
  }

  function showFields() {
    const preset = mathPresets[presetSelect.value]
    fields.replaceChildren()
    inputs.clear()
    for (const field of preset.fields) {
      const wrapper = doc.createElement('label')
      wrapper.textContent = label(field.ro, field.en)
      const input = doc.createElement(presetSelect.value === 'custom' ? 'textarea' : 'input')
      input.value = field.value
      input.maxLength = 2400
      input.spellcheck = false
      input.autocapitalize = 'none'
      input.dir = 'ltr'
      input.addEventListener('input', refresh)
      wrapper.append(input)
      fields.append(wrapper)
      inputs.set(field.name, input)
    }
    void refresh()
  }

  function setOpen(open, returnFocus = false) {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.classList.toggle('active', open)
    if (open) {
      beforeOpen()
      if (!initialized) {
        for (const [key, preset] of Object.entries(mathPresets)) {
          const option = doc.createElement('option')
          option.value = key
          option.textContent = label(preset.ro, preset.en)
          presetSelect.append(option)
        }
        initialized = true
        showFields()
      } else {
        void refresh()
      }
      presetSelect.focus()
    } else {
      validation++
      setDraft(null)
      if (returnFocus) toggle.focus()
    }
  }

  async function copy(wrapped) {
    const draft = validDraft
    if (!draft) return
    const text = wrapped ? draft.wrapped : draft.tex
    try {
      await copyText(text)
      if (validDraft === draft) report(label('Copiat.', 'Copied.'))
    } catch {
      if (validDraft !== draft) return
      source.value = text
      source.focus()
      source.select()
      report(label('Copiază textul selectat manual.', 'Copy the selected text manually.'))
    }
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden))
  byName('close').addEventListener('click', () => setOpen(false, true))
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    setOpen(false, true)
  })
  presetSelect.addEventListener('change', showFields)
  mode.addEventListener('change', refresh)
  copyButton.addEventListener('click', () => void copy(false))
  copyAtlasButton.addEventListener('click', () => void copy(true))
  insertButton.addEventListener('click', () => {
    if (!validDraft) return
    if (insert(validDraft.wrapped)) setOpen(false)
    else report(label('Formula nu a putut fi inserată. Poți copia sursa.', 'Could not insert the formula. You can copy the source.'), true)
  })
  return {
    close: () => setOpen(false),
    reset: () => {
      setOpen(false)
      initialized = false
      mode.value = 'inline'
      presetSelect.replaceChildren()
      fields.replaceChildren()
      inputs.clear()
      preview.replaceChildren()
      source.value = ''
      report('')
    }
  }
}
