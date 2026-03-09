export function readStorageValue(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key)

    if (!rawValue) {
      return fallbackValue
    }

    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

export function writeStorageValue(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function removeStorageValue(key) {
  window.localStorage.removeItem(key)
}
