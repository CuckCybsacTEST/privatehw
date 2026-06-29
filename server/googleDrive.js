import crypto from 'node:crypto'

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const GOOGLE_DRIVE_MEDIA_URL = 'https://www.googleapis.com/drive/v3/files'

const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL || ''
const serviceAccountPrivateKey = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || ''
const googleDriveApiKey = process.env.GOOGLE_DRIVE_API_KEY || ''

let cachedToken = null

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function getServiceAccountAccessToken() {
  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    return ''
  }

  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.accessToken
  }

  const issuedAtSeconds = Math.floor(Date.now() / 1000)
  const expiresAtSeconds = issuedAtSeconds + 3600
  const jwtHeader = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const jwtClaim = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccountEmail,
      scope: GOOGLE_DRIVE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
    }),
  )

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${jwtHeader}.${jwtClaim}`)
  signer.end()

  const signature = base64UrlEncode(signer.sign(serviceAccountPrivateKey))
  const assertion = `${jwtHeader}.${jwtClaim}.${signature}`

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(payload || 'No se pudo autenticar con Google Drive.')
  }

  const payload = await response.json()
  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  }

  return cachedToken.accessToken
}

export function isGoogleDriveConfigured() {
  return Boolean(serviceAccountEmail && serviceAccountPrivateKey)
}

export function getGoogleDriveFolderId() {
  return googleDriveFolderId
}

export function buildGoogleDriveDownloadUrl(fileId) {
  if (googleDriveApiKey) {
    return `${GOOGLE_DRIVE_MEDIA_URL}/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(googleDriveApiKey)}`
  }

  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
}

export async function uploadGoogleDriveFile({ buffer, filename, mimeType, folderId }) {
  const accessToken = await getServiceAccountAccessToken()

  if (!accessToken) {
    throw new Error('Google Drive no esta configurado para subir archivos.')
  }

  const boundary = `drive-${crypto.randomBytes(12).toString('hex')}`
  const metadata = {
    name: filename,
    ...(folderId ? { parents: [folderId] } : {}),
  }

  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\n`),
    Buffer.from(`Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const response = await fetch(
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,mimeType`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  )

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(payload || 'No se pudo subir el archivo a Google Drive.')
  }

  return response.json()
}

export async function fetchGoogleDriveMedia(fileId, rangeHeader = '') {
  const accessToken = await getServiceAccountAccessToken()
  const sourceUrl = accessToken
    ? `${GOOGLE_DRIVE_MEDIA_URL}/${encodeURIComponent(fileId)}?alt=media`
    : buildGoogleDriveDownloadUrl(fileId)

  const headers = {}

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  if (rangeHeader) {
    headers.Range = rangeHeader
  }

  let response = await fetch(sourceUrl, {
    headers,
    redirect: 'follow',
  })

  if (!response.ok && rangeHeader) {
    const retryHeaders = { ...headers }
    delete retryHeaders.Range
    response = await fetch(sourceUrl, {
      headers: retryHeaders,
      redirect: 'follow',
    })
  }

  if (!response.ok && accessToken) {
    const publicFallbackUrl = buildGoogleDriveDownloadUrl(fileId)
    const publicFallbackHeaders = rangeHeader ? { Range: rangeHeader } : {}
    response = await fetch(publicFallbackUrl, {
      headers: publicFallbackHeaders,
      redirect: 'follow',
    })
  }

  return response
}
