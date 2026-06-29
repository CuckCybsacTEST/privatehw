import { useEffect, useRef } from 'react'

export function TelegramLoginWidget({ botUsername, onAuth, onError, className = '' }) {
  const containerRef = useRef(null)
  const onAuthRef = useRef(onAuth)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onAuthRef.current = onAuth
    onErrorRef.current = onError
  }, [onAuth, onError])

  useEffect(() => {
    if (!botUsername || !containerRef.current) {
      return undefined
    }

    const callbackName = `telegramAuth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const previousCallback = window[callbackName]

    window[callbackName] = async (user) => {
      try {
        await onAuthRef.current?.(user)
      } catch (error) {
        onErrorRef.current?.(error)
      }
    }

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', `${callbackName}(user)`)

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      if (previousCallback) {
        window[callbackName] = previousCallback
      } else {
        delete window[callbackName]
      }
    }
  }, [botUsername])

  if (!botUsername) {
    return null
  }

  return <div ref={containerRef} className={`telegram-login-slot${className ? ` ${className}` : ''}`} />
}
