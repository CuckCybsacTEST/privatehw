function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo leer la imagen'))
    image.src = source
  })
}

export async function optimizeImageFile(file, options = {}) {
  const { maxWidth = 1600, quality = 0.82, mimeType = 'image/jpeg' } = options

  const fileReader = new FileReader()

  const dataUrl = await new Promise((resolve, reject) => {
    fileReader.onload = () => resolve(fileReader.result)
    fileReader.onerror = () => reject(new Error('No se pudo cargar el archivo'))
    fileReader.readAsDataURL(file)
  })

  const image = await loadImage(dataUrl)
  const scale = Math.min(1, maxWidth / image.width)
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL(mimeType, quality)
}
