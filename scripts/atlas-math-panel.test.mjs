import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mathPresets, prepareMathDraft } from '../js/atlas-math-panel.js'
import { splitAtlasMath } from '../js/atlas-math.js'
import { renderToString } from '../js/vendor/katex-0.19.1/katex.mjs'

const options = { trust: false, strict: 'error', throwOnError: true, maxExpand: 256, maxSize: 12 }
const initial = preset => Object.fromEntries(mathPresets[preset].fields.map(field => [field.name, field.value]))

test('all panel presets render and round-trip as exactly one formula in both modes', () => {
  for (const preset of Object.keys(mathPresets)) {
    for (const display of [false, true]) {
      const draft = prepareMathDraft(preset, initial(preset), display)
      assert.deepEqual(splitAtlasMath(draft.wrapped), [{ tex: draft.tex, display }], preset)
      assert.match(renderToString(draft.tex, { ...options, displayMode: display }), /<math/, preset)
    }
  }
})

test('integral bounds and nested functions replace only their own slots', () => {
  const fields = {
    from: '0',
    to: String.raw`\frac{\pi}{2}`,
    body: String.raw`\sin^{2}(t)`,
    variable: 't'
  }
  const draft = prepareMathDraft('integral', fields, true)
  assert.equal(draft.wrapped, String.raw`\[\int_{0}^{\frac{\pi}{2}} \sin^{2}(t)\,\mathrm{d}{t}\]`)
  assert.match(renderToString(draft.tex, options), /<math/)
})

test('missing fields, unbalanced braces and pasted math delimiters cannot change the template', () => {
  assert.throws(() => prepareMathDraft('fraction', { top: 'a', bottom: '' }, false), /Numitor/)
  assert.throws(() => prepareMathDraft('fraction', { top: 'a}{b', bottom: 'c' }, false), /Acolade/)
  assert.throws(() => prepareMathDraft('fraction', { top: String.raw`\(a\)`, bottom: 'c' }, false), /delimitatori/)
  assert.throws(() => prepareMathDraft('custom', { tex: String.raw`\[x` }, false), /delimitatori/)
  assert.throws(() => renderToString(prepareMathDraft('custom', { tex: '\\madeupfunction{x}' }, false).tex, options), /Undefined control sequence/)
})

test('pasting a complete Atlas formula in freeform removes the old wrapper and applies the chosen mode', () => {
  const draft = prepareMathDraft('custom', { tex: String.raw`\[\frac{x}{y}\]` }, false)
  assert.equal(draft.tex, String.raw`\frac{x}{y}`)
  assert.equal(draft.wrapped, String.raw`\(\frac{x}{y}\)`)
  assert.equal(prepareMathDraft('custom', { tex: String.raw`\left\{x\right\}` }, false).tex, String.raw`\left\{x\right\}`)
})
