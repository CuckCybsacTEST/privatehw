export async function uploadGoogleDriveVideoAsset({
  file,
  slug,
  variant,
  accessToken,
  onProgress,
}) {
  const url = new URL('/api/media/google-drive/upload', window.location.origin)
  url.searchParams.set('slug', slug)
  url.searchParams.set('variant', variant)
  url.searchParams.set('filename', file.name || `${slug}-${variant}.bin`)
  url.searchParams.set('mimeType', file.type || 'application/octet-stream')

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url.toString())
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    if (accessToken) {
      request.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    }

    request.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) {
        return
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          const payload = JSON.parse(request.responseText)
          onProgress?.(100)
          resolve(payload)
          return
        } catch {
          reject(new Error('No se pudo completar la subida a Google Drive.'))
          return
        }
      }

      try {
        const payload = JSON.parse(request.responseText)
        reject(new Error(payload.error || payload.message || 'No se pudo subir el video.'))
      } catch {
        reject(new Error('No se pudo subir el video.'))
      }
    }

    request.onerror = () => reject(new Error('Fallo la conexion durante la subida a Drive.'))
    request.send(file)
  })
}
