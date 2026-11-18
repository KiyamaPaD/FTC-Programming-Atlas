import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitAtlasMath } from '../js/atlas-math.js'
import { renderToString } from '../js/vendor/katex-0.19.1/katex.mjs'

test('reads inline and multiline display math while leaving currency and normal prose alone', () => {
  assert.deepEqual(splitAtlasMath(String.raw`Costă $5. Viteza este \(\frac{d}{t}\). $$a^2+b^2=c^2$$`), [
    { text: 'Costă $5. Viteza este ' },
    { tex: String.raw`\frac{d}{t}`, display: false },
    { text: '. ' },
    { tex: 'a^2+b^2=c^2', display: true }
  ])
  assert.deepEqual(splitAtlasMath('\\[\nx+y\n\\]'), [{ tex: 'x+y', display: true }])
})

test('leaves escaped, incomplete and oversized expressions readable as author text', () => {
  for (const value of [String.raw`\\(x\)`, String.raw`\(x`, String.raw`\( \)`, '\\(' + 'x'.repeat(2401) + '\\)']) {
    assert.deepEqual(splitAtlasMath(value), [{ text: value }])
  }
})

test('local KaTeX renders accessible math and does not allow HTML URLs', () => {
  const options = { trust: false, strict: 'error', throwOnError: true, maxExpand: 256, maxSize: 12 }
  const output = renderToString(String.raw`S(t)=\int_0^t e(\tau)\,\mathrm{d}\tau`, options)
  assert.match(output, /<math/)
  assert.match(output, /application\/x-tex/)
  const untrusted = String.raw`\href{https://example.com}{x}`
  try {
    assert.doesNotMatch(renderToString(untrusted, options), /href=/)
  } catch (error) {
    assert.equal(error.name, 'ParseError')
  }
})

test('only explicitly marked text attachments are eligible for math rendering', async () => {
  const { isAtlasMathSnippet } = await import('../js/atlas-math.js')
  assert.equal(isAtlasMathSnippet('text', String.raw`Cost: \(J=e^2\)`), true)
  assert.equal(isAtlasMathSnippet('text', 'x[k+1] = Ax[k] + Bu[k]'), false)
  assert.equal(isAtlasMathSnippet('java', String.raw`// \(f(x)\)`), false)
  assert.equal(isAtlasMathSnippet('bash', 'echo $$'), false)
})
