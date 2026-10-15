/** Reduz a foto do celular para no máximo 1280px e JPEG, para economizar espaço. */
export async function reduzirFoto(arquivo: File, ladoMaximo = 1280): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo)
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagem.width * escala)
  canvas.height = Math.round(imagem.height * escala)
  canvas.getContext('2d')!.drawImage(imagem, 0, 0, canvas.width, canvas.height)
  imagem.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível ler a foto.'))), 'image/jpeg', 0.8),
  )
}
