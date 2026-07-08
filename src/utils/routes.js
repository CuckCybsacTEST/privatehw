function isExternalPath(path = '') {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path) || path.startsWith('mailto:') || path.startsWith('tel:')
}

export function withBasePath(basePath = '', path = '') {
  const normalizedBasePath = String(basePath || '').trim().replace(/\/+$/, '')
  const targetPath = String(path || '').trim()

  if (!normalizedBasePath || normalizedBasePath === '/') {
    return targetPath
  }

  if (
    targetPath === normalizedBasePath ||
    targetPath.startsWith(`${normalizedBasePath}/`) ||
    targetPath.startsWith(`${normalizedBasePath}?`) ||
    targetPath.startsWith(`${normalizedBasePath}#`)
  ) {
    return targetPath
  }

  if (!targetPath) {
    return normalizedBasePath
  }

  if (targetPath.startsWith('#') || targetPath.startsWith('?')) {
    return `${normalizedBasePath}${targetPath}`
  }

  if (isExternalPath(targetPath)) {
    return targetPath
  }

  return targetPath.startsWith('/') ? `${normalizedBasePath}${targetPath}` : `${normalizedBasePath}/${targetPath}`
}
