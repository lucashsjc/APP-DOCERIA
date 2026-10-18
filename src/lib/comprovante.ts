import { totalPago, totalPedido, type Cliente, type Pagamento, type Pedido } from '../data/types'
import { NOME_LOJA, SUBTITULO_LOJA } from '../marca'
import { formatarData, formatarMoeda } from './format'
import { formatarQuantidade } from './producao'

// Cores fixas (a imagem é sempre clara, mesmo com o celular no modo escuro).
const COR = {
  fundo: '#fffafc',
  marca: '#d63a78',
  chocolate: '#5b2f24',
  texto: '#34222b',
  suave: '#84707b',
  linha: '#f0dde6',
  faixa: '#fde6f0',
}

const LARGURA = 1080
const MARGEM = 72
const FONTE = "'Poppins', sans-serif"

export function tituloDocumento(pedido: Pedido, pagamentos: Pagamento[]): string {
  if (pedido.status === 'orcamento') return 'Orçamento'
  const pago = totalPago(pedido.id, pagamentos)
  return pago > 0 && pago >= totalPedido(pedido) ? 'Recibo' : 'Pedido confirmado'
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Quebra o texto em linhas que caibam na largura. */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width > largura && atual) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

/**
 * Desenha o orçamento/comprovante. Roda duas vezes: a primeira só mede a altura,
 * a segunda desenha no canvas do tamanho certo.
 */
function desenhar(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  pedido: Pedido,
  cliente: Cliente | null,
  pagamentos: Pagamento[],
): number {
  const direita = LARGURA - MARGEM
  const util = LARGURA - MARGEM * 2
  let y = 0

  ctx.fillStyle = COR.fundo
  ctx.fillRect(0, 0, LARGURA, ctx.canvas.height)

  // Cabeçalho: o logo da loja, ou o nome escrito se a imagem não carregar.
  if (logo) {
    const recorteY = logo.height * 0.05
    const recorteAltura = logo.height * 0.9
    const altura = (LARGURA / logo.width) * recorteAltura
    ctx.drawImage(logo, 0, recorteY, logo.width, recorteAltura, 0, 0, LARGURA, altura)
    y = altura
  } else {
    ctx.fillStyle = COR.faixa
    ctx.fillRect(0, 0, LARGURA, 260)
    ctx.textAlign = 'center'
    ctx.fillStyle = COR.marca
    ctx.font = `700 96px 'Dancing Script', cursive`
    ctx.fillText(NOME_LOJA, LARGURA / 2, 150)
    ctx.fillStyle = COR.chocolate
    ctx.font = `600 44px 'Dancing Script', cursive`
    ctx.fillText(SUBTITULO_LOJA, LARGURA / 2, 215)
    ctx.textAlign = 'left'
    y = 260
  }

  // Título
  y += 96
  ctx.fillStyle = COR.chocolate
  ctx.font = `700 60px ${FONTE}`
  ctx.fillText(tituloDocumento(pedido, pagamentos), MARGEM, y)

  const campo = (rotulo: string, valor: string) => {
    y += 58
    ctx.font = `500 30px ${FONTE}`
    ctx.fillStyle = COR.suave
    ctx.fillText(rotulo, MARGEM, y)
    ctx.font = `600 34px ${FONTE}`
    ctx.fillStyle = COR.texto
    const linhas = quebrar(ctx, valor, util - 260)
    linhas.forEach((l, i) => ctx.fillText(l, MARGEM + 260, y + i * 44))
    y += (linhas.length - 1) * 44
  }

  y += 20
  if (cliente) campo('Cliente', cliente.nome)
  const data = formatarData(pedido.data_entrega)
  campo(pedido.tipo === 'entrega' ? 'Entrega' : 'Retirada', `${data[0].toUpperCase()}${data.slice(1)}${pedido.horario ? ` às ${pedido.horario}` : ''}`)
  if (pedido.tipo === 'entrega' && pedido.endereco) campo('Endereço', pedido.endereco)
  if (pedido.tema) campo('Tema', pedido.tema)

  const separador = () => {
    y += 40
    ctx.strokeStyle = COR.linha
    ctx.lineWidth = 3
    ctx.setLineDash([12, 10])
    ctx.beginPath()
    ctx.moveTo(MARGEM, y)
    ctx.lineTo(direita, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const linhaValor = (texto: string, valor: string, destaque = false, cor = COR.texto) => {
    y += destaque ? 64 : 54
    ctx.font = destaque ? `700 42px ${FONTE}` : `400 34px ${FONTE}`
    ctx.fillStyle = cor
    ctx.textAlign = 'right'
    ctx.fillText(valor, direita, y)
    const largValor = ctx.measureText(valor).width
    ctx.textAlign = 'left'
    const linhas = quebrar(ctx, texto, util - largValor - 40)
    linhas.forEach((l, i) => ctx.fillText(l, MARGEM, y + i * 44))
    y += (linhas.length - 1) * 44
  }

  // Itens
  separador()
  y += 20
  ctx.font = `600 30px ${FONTE}`
  ctx.fillStyle = COR.suave
  ctx.fillText('ITENS', MARGEM, y + 20)
  y += 24
  for (const item of pedido.itens) {
    linhaValor(
      `${formatarQuantidade(item.quantidade)}× ${item.descricao}`,
      formatarMoeda(item.quantidade * item.valor_unitario),
    )
  }
  if (pedido.taxa_entrega > 0) linhaValor('Taxa de entrega', formatarMoeda(pedido.taxa_entrega), false, COR.suave)

  separador()
  const total = totalPedido(pedido)
  linhaValor('Total', formatarMoeda(total), true, COR.chocolate)

  if (pedido.status !== 'orcamento') {
    const pago = totalPago(pedido.id, pagamentos)
    const falta = Math.max(0, Math.round((total - pago) * 100) / 100)
    linhaValor('Pago', formatarMoeda(pago))
    if (falta > 0) linhaValor('Falta pagar', formatarMoeda(falta), true, COR.marca)
  }

  // Rodapé
  y += 110
  ctx.textAlign = 'center'
  ctx.fillStyle = COR.marca
  ctx.font = `700 52px 'Dancing Script', cursive`
  ctx.fillText('Obrigada pela preferência!', LARGURA / 2, y)
  ctx.textAlign = 'left'
  return y + 90
}

/** Gera a imagem (PNG) do orçamento/comprovante. */
export async function gerarComprovante(
  pedido: Pedido,
  cliente: Cliente | null,
  pagamentos: Pagamento[],
): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`700 40px Poppins`),
    document.fonts.load(`400 40px Poppins`),
    document.fonts.load(`700 40px 'Dancing Script'`),
  ]).catch(() => {})
  const logo = await carregarImagem('/logo-loja.jpg')

  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = 4000
  const ctx = canvas.getContext('2d')!
  const altura = desenhar(ctx, logo, pedido, cliente, pagamentos)
  canvas.height = Math.ceil(altura)
  desenhar(ctx, logo, pedido, cliente, pagamentos)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png'),
  )
}

/** Abre o menu de compartilhar do celular (WhatsApp etc.); no computador, baixa o arquivo. */
export async function compartilharArquivo(conteudo: Blob, nomeArquivo: string, titulo: string) {
  const arquivo = new File([conteudo], nomeArquivo, { type: conteudo.type || 'application/octet-stream' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: titulo })
    } catch (e) {
      // Fechar o menu sem escolher nada não é erro.
      if ((e as Error).name !== 'AbortError') throw e
    }
    return
  }
  const url = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
