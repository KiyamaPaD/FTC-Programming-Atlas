// FTC Programming Atlas · privacy language routing
const LANGUAGE_STORAGE_KEY = 'ftc_atlas_language_v1'
const SUPPORTED_LANGUAGES = new Set(['ro', 'en'])

function storedLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)

  return SUPPORTED_LANGUAGES.has(stored)
    ? stored
    : null
}

function currentPageLanguage() {
  return window.location.pathname.endsWith('/privacy-en.html')
    ? 'en'
    : 'ro'
}

function routeToPreferredLanguage() {
  const preferred = storedLanguage()
  const current = currentPageLanguage()

  // With no saved preference, the explicit privacy-page URL wins.
  if (!preferred || preferred === current) return

  const target =
    preferred === 'en'
      ? '/privacy-en.html'
      : '/privacy.html'

  window.location.replace(target)
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('[data-privacy-language]')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        const nextLanguage =
          link.dataset.privacyLanguage

        if (!SUPPORTED_LANGUAGES.has(nextLanguage)) {
          return
        }

        event.preventDefault()
        localStorage.setItem(
          LANGUAGE_STORAGE_KEY,
          nextLanguage
        )

        window.location.assign(
          nextLanguage === 'en'
            ? '/privacy-en.html'
            : '/privacy.html'
        )
      })
    })
})

routeToPreferredLanguage()
