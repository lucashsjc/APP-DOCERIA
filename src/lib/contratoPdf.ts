import type { Bloco } from './contratos'

const LARGURA = 210 // A4, em milímetros
const ALTURA = 297
const MARGEM = 22
const UTIL = LARGURA - MARGEM * 2
const LINHA_MM = 5.2

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Gera o PDF do contrato (A4) a partir dos blocos. A biblioteca só é baixada quando usada. */
export async function gerarContratoPdf(blocos: Bloco[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await carregarImagem('/logo-loja.jpg')
  let y = MARGEM

  const novaPaginaSePreciso = (altura: number) => {
    if (y + altura > ALTURA - MARGEM) {
      doc.addPage()
      y = MARGEM
    }
  }

  // Logo no canto superior direito, como no modelo da loja.
  if (logo) {
    const largura = 48
    const altura = (logo.height / logo.width) * largura
    doc.addImage(logo, 'JPEG', LARGURA - MARGEM - largura, y - 8, largura, altura)
    y += altura - 2
  }

  const texto = (conteudo: string, opcoes: { tamanho?: number; negrito?: boolean; recuo?: number; centro?: boolean; cor?: number }) => {
    const { tamanho = 10.5, negrito = false, recuo = 0, centro = false, cor = 30 } = opcoes
    doc.setFont('helvetica', negrito ? 'bold' : 'normal')
    doc.setFontSize(tamanho)
    doc.setTextColor(cor)
    const linhas: string[] = doc.splitTextToSize(conteudo, UTIL - recuo)
    const alturaLinha = LINHA_MM * (tamanho / 10.5)
    for (const linha of linhas) {
      novaPaginaSePreciso(alturaLinha)
      if (centro) doc.text(linha, LARGURA / 2, y, { align: 'center' })
      else doc.text(linha, MARGEM + recuo, y)
      y += alturaLinha
    }
  }

  for (const b of blocos) {
    switch (b.tipo) {
      case 'titulo':
        y += 4
        texto(b.texto, { tamanho: 13, negrito: true, centro: true, cor: 70 })
        y += 1
        break
      case 'subtitulo':
        texto(b.texto, { tamanho: 12, negrito: true, centro: true, cor: 70 })
        y += 3
        break
      case 'secao':
        y += 4
        novaPaginaSePreciso(LINHA_MM * 3)
        texto(b.texto, { tamanho: 11, negrito: true })
        y += 1
        break
      case 'paragrafo':
        texto(b.texto, {})
        y += 1
        break
      case 'destaque':
        texto(b.texto, { negrito: true })
        y += 1
        break
      case 'item':
        texto(`•  ${b.texto}`, { recuo: b.nivel === 2 ? 14 : 6 })
        y += 0.5
        break
      case 'campo':
        texto(`${b.rotulo}: ${b.valor}`, { recuo: 6 })
        break
      case 'espaco':
        y += 4
        break
      case 'assinaturas':
        for (const quem of ['CONTRATANTE', 'CONTRATADA']) {
          y += 16
          novaPaginaSePreciso(14)
          doc.setDrawColor(60)
          doc.line(MARGEM, y, MARGEM + 95, y)
          y += 5
          texto(quem, {})
        }
        break
    }
  }

  return doc.output('blob')
}
