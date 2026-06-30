const RUNTIME_CONFIG_KEY = '__privatehwRuntimeConfig'

function getRuntimeConfig() {
  const globalState = globalThis
  const runtimeConfig = globalState?.[RUNTIME_CONFIG_KEY]

  return runtimeConfig && typeof runtimeConfig === 'object' ? runtimeConfig : {}
}

export function readClientEnv(name) {
  const runtimeValue = getRuntimeConfig()[name]

  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim()
  }

  const viteEnvValue = import.meta.env?.[name]

  return typeof viteEnvValue === 'string' ? viteEnvValue.trim() : ''
}

