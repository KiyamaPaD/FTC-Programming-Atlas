export const ATLAS_RELEASE = 102
export const LEGACY_I18N_RELEASE = 56

export const atlasVersionedPath = (path, release = ATLAS_RELEASE) =>
  `${path}?v=${release}`
