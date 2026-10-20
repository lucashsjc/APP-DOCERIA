import { urlDaFoto } from '../data/repo'
import type { Produto } from '../data/types'
import { NOME_LOJA, SUBTITULO_LOJA } from '../marca'
import { precoDeVitrine } from './categorias'
import { formatarMes, hojeIso } from './format'

// Cores fixas, as mesmas do comprovante (o PDF é sempre claro).
const COR = {
  fundo: '#fffafc',
  cartao: '#ffffff',
  marca: '#d63a78',
  pilula: '#f27bb1',
  chocolate: '#5b2f24',
  texto: '#34222b',
  suave: '#84707b',
  linha: '#f0dde6',
  faixa: '#fde6f0',
}

// Página A4 desenhada em 150 dpi.
const L = 1240
const A = 1754
const M = 80
const GAP = 24
const COLUNA = (L - M * 2 - GAP) / 2
const FOTO = 150
const PAD = 20
const TEXTO = COLUNA - PAD * 3 - FOTO
const TOPO_CAPA = 640
const TOPO = 160
const RODAPE = 96
const FONTE = "'Poppins', sans-serif"

export interface SecaoCardapio {
  nome: string
  descricao: string
  produtos: Produto[]
}

interface Bloco {
  altura: number
  /** Não deixa o bloco sozinho no fim da página (título de seção). */
  juntoDoProximo?: boolean
  desenhar: (ctx: CanvasRenderingContext2D, y: number) => void
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Fotos enviadas por ela vêm do Supabase; sem isso o canvas não pode ser exportado.
    if (!src.startsWith('/')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maximo = Infinity): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width > largura && atual) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length > maximo) {
    const cortadas = linhas.slice(0, maximo)
    let ultima = cortadas[maximo - 1]
    while (ultima && ctx.measureText(`${ultima}…`).width > largura) ultima = ultima.slice(0, -1)
    cortadas[maximo - 1] = `${ultima.trimEnd()}…`
    return cortadas
  }
  return linhas
}

/** Desenha a imagem recortada para preencher o retângulo (como object-fit: cover). */
function desenharCobrindo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const escala = Math.max(w / img.width, h / img.height)
  const sw = w / escala
  const sh = h / escala
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function fotoRedonda(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, nome: string, x: number, y: number) {
  const r = FOTO / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = COR.faixa
  ctx.fill()
  if (img) {
    ctx.clip()
    desenharCobrindo(ctx, img, x, y, FOTO, FOTO)
  } else {
    ctx.fillStyle = COR.marca
    ctx.font = `700 60px ${FONTE}`
    ctx.textAlign = 'center'
    ctx.fillText(nome.trim()[0]?.toUpperCase() ?? '', x + r, y + r + 21)
  }
  ctx.restore()
}

/** Mede e desenha o cartão de um produto (foto à esquerda, textos à direita). */
function cartaoProduto(ctx: CanvasRenderingContext2D, p: Produto, foto: HTMLImageElement | null) {
  ctx.font = `700 29px ${FONTE}`
  const nome = quebrar(ctx, p.nome, TEXTO, 3)
  ctx.font = `400 22px ${FONTE}`
  const descricao = p.descricao ? quebrar(ctx, p.descricao, TEXTO, 7) : []
  const preco = precoDeVitrine(p)
  const alturaTexto =
    nome.length * 35 + (descricao.length ? 6 + descricao.length * 28 : 0) + 16 + 48 + (preco.secundario ? 34 : 0)
  const altura = Math.max(FOTO, alturaTexto) + PAD * 2

  const desenhar = (x: number, y: number, alturaLinha: number) => {
    ctx.fillStyle = COR.cartao
    ctx.strokeStyle = COR.linha
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x, y, COLUNA, alturaLinha, 28)
    ctx.fill()
    ctx.stroke()

    fotoRedonda(ctx, foto, p.nome, x + PAD, y + (alturaLinha - FOTO) / 2)

    const tx = x + PAD * 2 + FOTO
    let ty = y + (alturaLinha - alturaTexto) / 2
    ctx.textAlign = 'left'
    ctx.fillStyle = COR.texto
    ctx.font = `700 29px ${FONTE}`
    for (const l of nome) {
      ty += 35
      ctx.fillText(l, tx, ty - 8)
    }
    if (descricao.length) {
      ty += 6
      ctx.fillStyle = COR.suave
      ctx.font = `400 22px ${FONTE}`
      for (const l of descricao) {
        ty += 28
        ctx.fillText(l, tx, ty - 7)
      }
    }
    ty += 16
    ctx.font = `700 25px ${FONTE}`
    const largura = Math.min(ctx.measureText(preco.principal).width + 36, TEXTO)
    ctx.fillStyle = COR.pilula
    ctx.beginPath()
    ctx.roundRect(tx, ty, largura, 48, 24)
    ctx.fill()
    ctx.fillStyle = '#141416'
    ctx.fillText(preco.principal, tx + 18, ty + 33)
    ty += 48
    if (preco.secundario) {
      ctx.fillStyle = COR.suave
      ctx.font = `500 21px ${FONTE}`
      ctx.fillText(preco.secundario, tx + 4, ty + 28)
    }
  }
  return { altura, desenhar }
}

function montarBlocos(ctx: CanvasRenderingContext2D, secoes: SecaoCardapio[], fotos: Map<string, HTMLImageElement | null>) {
  const blocos: Bloco[] = []
  for (const s of secoes) {
    ctx.font = `400 25px ${FONTE}`
    const descricao = s.descricao ? quebrar(ctx, s.descricao, L - M * 2) : []
    blocos.push({
      altura: 110 + descricao.length * 34,
      juntoDoProximo: true,
      desenhar: (c, y) => {
        c.textAlign = 'left'
        c.fillStyle = COR.chocolate
        c.font = `700 44px ${FONTE}`
        c.fillText(s.nome, M, y + 70)
        c.fillStyle = COR.pilula
        c.beginPath()
        c.roundRect(M, y + 88, 64, 8, 4)
        c.fill()
        c.fillStyle = COR.suave
        c.font = `400 25px ${FONTE}`
        descricao.forEach((l, i) => c.fillText(l, M, y + 132 + i * 34))
      },
    })
    for (let i = 0; i < s.produtos.length; i += 2) {
      const cartoes = s.produtos.slice(i, i + 2).map((p) => cartaoProduto(ctx, p, fotos.get(p.id) ?? null))
      const altura = Math.max(...cartoes.map((c) => c.altura))
      blocos.push({
        altura: altura + GAP,
        desenhar: (_c, y) => cartoes.forEach((c, j) => c.desenhar(M + j * (COLUNA + GAP), y + GAP / 2, altura)),
      })
    }
  }
  return blocos
}

/** Distribui os blocos nas páginas, sem deixar título de seção sozinho no pé da página. */
function paginar(blocos: Bloco[]) {
  const paginas: { y: number; bloco: Bloco }[][] = [[]]
  let y = TOPO_CAPA
  blocos.forEach((b, i) => {
    const proximo = b.juntoDoProximo ? (blocos[i + 1]?.altura ?? 0) : 0
    if (y + b.altura + proximo > A - RODAPE && paginas[paginas.length - 1].length > 0) {
      paginas.push([])
      y = TOPO
    }
    paginas[paginas.length - 1].push({ y, bloco: b })
    y += b.altura
  })
  return paginas
}

function desenharPagina(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  pagina: { y: number; bloco: Bloco }[],
  numero: number,
  total: number,
) {
  ctx.fillStyle = COR.fundo
  ctx.fillRect(0, 0, L, A)

  if (numero === 1) {
    // Capa: o logo da loja de ponta a ponta e o título.
    const alturaLogo = 470
    if (logo) {
      const recorte = (alturaLogo / L) * logo.width
      // Corta só o alto dos balões, para o "Confeitaria Artística" aparecer inteiro.
      ctx.drawImage(logo, 0, logo.height - recorte, logo.width, recorte, 0, 0, L, alturaLogo)
    } else {
      ctx.fillStyle = COR.faixa
      ctx.fillRect(0, 0, L, alturaLogo)
      ctx.textAlign = 'center'
      ctx.fillStyle = COR.marca
      ctx.font = `700 120px 'Dancing Script', cursive`
      ctx.fillText(NOME_LOJA, L / 2, 300)
      ctx.fillStyle = COR.chocolate
      ctx.font = `600 54px 'Dancing Script', cursive`
      ctx.fillText(SUBTITULO_LOJA, L / 2, 390)
    }
    ctx.textAlign = 'center'
    ctx.fillStyle = COR.marca
    ctx.font = `700 110px 'Dancing Script', cursive`
    ctx.fillText('Cardápio', L / 2, alturaLogo + 120)
    ctx.textAlign = 'left'
  } else {
    ctx.textAlign = 'center'
    ctx.fillStyle = COR.marca
    ctx.font = `700 60px 'Dancing Script', cursive`
    ctx.fillText(NOME_LOJA, L / 2, 95)
    ctx.strokeStyle = COR.linha
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(M, 128)
    ctx.lineTo(L - M, 128)
    ctx.stroke()
    ctx.textAlign = 'left'
  }

  for (const { y, bloco } of pagina) bloco.desenhar(ctx, y)

  // Rodapé
  const yRodape = A - 48
  ctx.strokeStyle = COR.linha
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(M, yRodape - 44)
  ctx.lineTo(L - M, yRodape - 44)
  ctx.stroke()
  ctx.fillStyle = COR.suave
  ctx.font = `400 21px ${FONTE}`
  ctx.textAlign = 'left'
  ctx.fillText(`Valores sujeitos a alteração · Atualizado em ${formatarMes(hojeIso().slice(0, 7))}`, M, yRodape)
  ctx.textAlign = 'right'
  ctx.fillText(`${numero} de ${total}`, L - M, yRodape)
  ctx.textAlign = 'left'
}

/** Gera o cardápio em PDF (A4), com fotos, seções e preços. */
export async function gerarCardapioPdf(secoes: SecaoCardapio[]): Promise<Blob> {
  const [{ jsPDF }] = await Promise.all([
    import('jspdf'),
    document.fonts.load(`700 40px Poppins`),
    document.fonts.load(`400 40px Poppins`),
    document.fonts.load(`500 40px Poppins`),
    document.fonts.load(`700 40px 'Dancing Script'`),
  ])
  const produtos = secoes.flatMap((s) => s.produtos)
  const [logo, ...imagens] = await Promise.all([
    carregarImagem('/logo-loja.jpg'),
    ...produtos.map(async (p) => (p.foto ? carregarImagem(await urlDaFoto(p.foto).catch(() => '')) : null)),
  ])
  const fotos = new Map(produtos.map((p, i) => [p.id, imagens[i]]))

  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = A
  const ctx = canvas.getContext('2d')!
  const paginas = paginar(montarBlocos(ctx, secoes, fotos))

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  paginas.forEach((pagina, i) => {
    if (i > 0) doc.addPage()
    desenharPagina(ctx, logo, pagina, i + 1, paginas.length)
    doc.addImage(canvas.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, 210, 297)
  })
  return doc.output('blob')
}
