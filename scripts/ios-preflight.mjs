import { execFileSync } from 'node:child_process'

function fail(message) {
  console.error(`iOS preflight failed: ${message}`)
  process.exit(1)
}

if (process.platform !== 'darwin') {
  fail(
    'iOS native builds require macOS. Copy/pull this project onto a Mac, ' +
    'install Xcode, then run npm install and npm run ios:init.'
  )
}

try {
  const developerPath = execFileSync(
    'xcode-select',
    ['-p'],
    { encoding: 'utf8' }
  ).trim()

  if (!developerPath) {
    fail('Xcode Command Line Tools are not configured.')
  }

  console.log(`Xcode developer path: ${developerPath}`)
} catch {
  fail(
    'Xcode Command Line Tools are missing. Run: xcode-select --install'
  )
}

try {
  const version = execFileSync(
    'xcodebuild',
    ['-version'],
    { encoding: 'utf8' }
  ).trim()

  console.log(version)
} catch {
  fail('xcodebuild is unavailable. Install/open Xcode first.')
}

console.log('FTC Programming Atlas iOS preflight: OK')
