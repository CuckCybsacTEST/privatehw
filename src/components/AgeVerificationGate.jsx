import { useEffect, useRef, useState } from 'react'
import { readStorageValue, writeStorageValue } from '../utils/storage'

const AGE_GATE_STORAGE_KEY = 'privatehw.age-gate.v1'

export function AgeVerificationGate({ children }) {
  const [isVerified, setIsVerified] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return Boolean(readStorageValue(AGE_GATE_STORAGE_KEY, false))
  })
  const confirmButtonRef = useRef(null)

  useEffect(() => {
    if (isVerified) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => {
      confirmButtonRef.current?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isVerified])

  function handleConfirm() {
    writeStorageValue(AGE_GATE_STORAGE_KEY, true)
    setIsVerified(true)
  }

  if (isVerified) {
    return children
  }

  return (
    <>
      <div className="age-verification-shell" aria-hidden="true" inert="">
        {children}
      </div>

      <div className="age-verification-overlay" aria-hidden="true" />

      <section
        className="age-verification-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-verification-title"
        aria-describedby="age-verification-description"
      >
        <p className="section-kicker">Acceso privado</p>
        <div className="age-verification-badge">+18</div>
        <h2 id="age-verification-title">Verificacion requerida</h2>
        <p id="age-verification-description">
          Esta experiencia es solo para personas adultas. Confirma tu edad para continuar hacia el
          sitio privado.
        </p>

        <div className="age-verification-actions">
          <button
            ref={confirmButtonRef}
            className="hero-primary-cta age-verification-confirm"
            type="button"
            onClick={handleConfirm}
          >
            Tengo 18 anos o mas
          </button>
          <p className="age-verification-note">Tu confirmacion se guarda en este navegador.</p>
        </div>
      </section>
    </>
  )
}
