import { totalPedido, type Cliente, type DadosContrato, type Pedido } from '../data/types'
import { CONTRATO } from '../marca'
import { formatarMoeda, hojeIso, somarDias } from './format'
import { formatarQuantidade } from './producao'

/** Um pedaço do contrato. A mesma lista vira a prévia na tela e o PDF. */
export type Bloco =
  | { tipo: 'titulo' | 'subtitulo' | 'secao' | 'paragrafo' | 'destaque'; texto: string }
  | { tipo: 'item'; texto: string; nivel?: 1 | 2 }
  | { tipo: 'campo'; rotulo: string; valor: string }
  | { tipo: 'espaco' }
  | { tipo: 'assinaturas' }

const LINHA = '______________________________'

function dataCurta(iso: string): string {
  if (!iso) return LINHA
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const ou = (valor: string | undefined) => (valor && valor.trim()) || LINHA

function partes(cliente: Cliente | null): Bloco[] {
  const c = CONTRATO.contratada
  return [
    { tipo: 'secao', texto: '1. AS PARTES:' },
    { tipo: 'campo', rotulo: 'CONTRATANTE', valor: ou(cliente?.nome) },
    { tipo: 'campo', rotulo: 'CPF', valor: ou(cliente?.cpf) },
    { tipo: 'campo', rotulo: 'Endereço', valor: ou(cliente?.endereco) },
    { tipo: 'campo', rotulo: 'Telefone', valor: ou(cliente?.telefone) },
    { tipo: 'espaco' },
    { tipo: 'campo', rotulo: 'CONTRATADA', valor: ou(c.nome) },
    { tipo: 'campo', rotulo: 'CPF/CNPJ', valor: ou(c.documento) },
    { tipo: 'campo', rotulo: 'Endereço', valor: ou(c.endereco) },
    { tipo: 'campo', rotulo: 'Telefone', valor: ou(c.telefone) },
  ]
}

/** Valor total, sinal de 50% e restante até a véspera do evento. */
function pagamento(pedido: Pedido, rotuloTotal: string): Bloco[] {
  const total = totalPedido(pedido)
  const metade = Math.round((total / 2) * 100) / 100
  const blocos: Bloco[] = [{ tipo: 'secao', texto: '4. VALOR E CONDIÇÕES DE PAGAMENTO' }]
  if (pedido.taxa_entrega > 0) {
    blocos.push({ tipo: 'item', texto: `Taxa de entrega: ${formatarMoeda(pedido.taxa_entrega)} (já incluída no total).` })
  }
  blocos.push(
    { tipo: 'item', texto: `${rotuloTotal}: ${formatarMoeda(total)}.` },
    {
      tipo: 'item',
      texto: `Sinal de 50% (${formatarMoeda(metade)}), via Pix ou depósito, para confirmar a reserva. A encomenda somente é confirmada após o pagamento do sinal.`,
    },
    {
      tipo: 'item',
      texto: `Restante de 50% (${formatarMoeda(total - metade)}) até ${dataCurta(somarDias(pedido.data_entrega, -1))}, um dia antes do evento.`,
    },
  )
  return blocos
}

function rodape(): Bloco[] {
  return [
    { tipo: 'espaco' },
    { tipo: 'paragrafo', texto: `${CONTRATO.cidade}, ${dataPorExtenso(hojeIso())}` },
    { tipo: 'assinaturas' },
  ]
}

function contratoLocacao(pedido: Pedido, cliente: Cliente | null, d: DadosContrato): Bloco[] {
  const objeto = d.objeto.trim()
    ? d.objeto.split('\n').filter((l) => l.trim())
    : pedido.itens.map((i) => `${formatarQuantidade(i.quantidade)}× ${i.descricao}`)
  return [
    { tipo: 'titulo', texto: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONFEITARIA' },
    { tipo: 'subtitulo', texto: '(Locação Bolo Cenográfico)' },
    ...partes(cliente),
    { tipo: 'secao', texto: '2. DO OBJETO:' },
    { tipo: 'paragrafo', texto: 'O presente contrato tem como objeto a locação temporária dos seguintes itens:' },
    ...objeto.map((texto): Bloco => ({ tipo: 'item', texto })),
    ...(d.acessorios.trim() ? [{ tipo: 'paragrafo', texto: `Acessórios inclusos: ${d.acessorios.trim()}` } as Bloco] : []),
    { tipo: 'secao', texto: '3. DATA, LOCAL E HORÁRIO:' },
    { tipo: 'campo', rotulo: 'Data do Evento', valor: dataCurta(pedido.data_entrega) },
    { tipo: 'campo', rotulo: 'Local da Festa', valor: ou(d.local) },
    { tipo: 'campo', rotulo: 'Horário da Entrega', valor: ou(d.horario_entrega) },
    {
      tipo: 'campo',
      rotulo: 'Horário/Data da Devolução',
      valor: d.devolucao_data ? `${d.devolucao_hora || LINHA} / ${dataCurta(d.devolucao_data)}` : LINHA,
    },
    ...pagamento(pedido, 'Valor Total da Locação'),
    { tipo: 'secao', texto: '5. RESPONSABILIDADES E CUIDADOS COM O BOLO' },
    { tipo: 'paragrafo', texto: '1. Parte Cenográfica (Fake):' },
    {
      tipo: 'item',
      nivel: 2,
      texto:
        'O bolo fake é de uso estritamente decorativo. É proibido furar, colar fitas, grampear, expor à chuva, sol excessivo, fontes de calor próximas (como velas sparkular/faíscas) ou molhar a peça.',
    },
    {
      tipo: 'item',
      nivel: 2,
      texto: 'Não utilizar produtos químicos para limpeza. O bolo deve ser devolvido exatamente nas mesmas condições em que foi entregue.',
    },
    { tipo: 'paragrafo', texto: '2. Parte Comestível (1º Andar Verdadeiro):' },
    {
      tipo: 'item',
      nivel: 2,
      texto:
        'O andar verdadeiro é perecível. Após a entrega/montagem, a responsabilidade pela refrigeração e conservação higiênico-sanitária passa a ser do Locatário ou do Buffet responsável.',
    },
    {
      tipo: 'item',
      nivel: 2,
      texto:
        'A Locadora não se responsabiliza por alterações no andar verdadeiro causadas por temperatura inadequada do ambiente da festa após a entrega.',
    },
    { tipo: 'secao', texto: '6. DANOS, AVARIAS E EXTRAVIOS' },
    {
      tipo: 'destaque',
      texto: `* Em caso de danos, manchas permanentes ou quebra da base cenográfica fake, o Locatário pagará à Locadora o valor integral de reposição da peça, fixado em ${formatarMoeda(CONTRATO.valorReposicao)} ou o custo real de restauração.`,
    },
    {
      tipo: 'destaque',
      texto:
        '* Em caso de extravio ou não devolução dos acessórios (como bandejas, bases de MDF, topo de bolo), será cobrado o valor de substituição de cada item.',
    },
    {
      tipo: 'destaque',
      texto: `* A devolução fora do prazo combinado gerará multa de ${formatarMoeda(CONTRATO.multaPorDia)} por dia de atraso.`,
    },
    { tipo: 'secao', texto: '7. DISPOSIÇÕES GERAIS' },
    {
      tipo: 'paragrafo',
      texto:
        'As partes declaram estar de acordo com todas as cláusulas acima descritas. E, por estarem assim justas e contratadas, assinam o presente instrumento em duas vias de igual teor.',
    },
    ...rodape(),
  ]
}

function contratoDoces(pedido: Pedido, cliente: Cliente | null, d: DadosContrato): Bloco[] {
  const excecoes = CONTRATO.pedidoMinimoExcecoes.map((e) => `${e.produto}: ${e.minimo} unidades`).join('; ')
  const entrega = pedido.tipo === 'entrega' ? 'Entrega no local' : 'Retirada pelo CONTRATANTE'
  return [
    { tipo: 'titulo', texto: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONFEITARIA' },
    { tipo: 'subtitulo', texto: '(Encomenda de Doces)' },
    ...partes(cliente),
    { tipo: 'secao', texto: '2. DO OBJETO:' },
    {
      tipo: 'paragrafo',
      texto: `O presente contrato tem como objeto a produção e o fornecimento dos seguintes itens${pedido.tema ? `, personalizados com o tema "${pedido.tema}"` : ''}:`,
    },
    ...pedido.itens.map(
      (i): Bloco => ({
        tipo: 'item',
        texto: `${formatarQuantidade(i.quantidade)}× ${i.descricao} (${formatarMoeda(i.valor_unitario)} cada): ${formatarMoeda(i.quantidade * i.valor_unitario)}`,
      }),
    ),
    ...(pedido.observacoes.trim()
      ? [{ tipo: 'paragrafo', texto: `Observações: ${pedido.observacoes.trim()}` } as Bloco]
      : []),
    { tipo: 'secao', texto: '3. DATA, LOCAL E HORÁRIO:' },
    { tipo: 'campo', rotulo: 'Data do Evento', valor: dataCurta(pedido.data_entrega) },
    { tipo: 'campo', rotulo: 'Forma', valor: entrega },
    { tipo: 'campo', rotulo: pedido.tipo === 'entrega' ? 'Local da Entrega' : 'Local da Retirada', valor: ou(d.local) },
    { tipo: 'campo', rotulo: pedido.tipo === 'entrega' ? 'Horário da Entrega' : 'Horário da Retirada', valor: ou(d.horario_entrega) },
    ...pagamento(pedido, 'Valor Total da Encomenda'),
    { tipo: 'secao', texto: '5. PEDIDO MÍNIMO E ALTERAÇÕES' },
    {
      tipo: 'item',
      texto: `Todos os doces têm pedido mínimo de ${CONTRATO.pedidoMinimo} unidades${excecoes ? ` (exceto ${excecoes})` : ''}.`,
    },
    {
      tipo: 'item',
      texto:
        'Alterações de quantidade, sabor ou tema devem ser combinadas com antecedência e estão sujeitas à disponibilidade da CONTRATADA e a ajuste de valor.',
    },
    {
      tipo: 'item',
      texto:
        'Em caso de cancelamento pelo CONTRATANTE, o sinal não será devolvido, pois é destinado à reserva da data e à compra dos insumos.',
    },
    { tipo: 'secao', texto: '6. CONSERVAÇÃO E CONSUMO' },
    {
      tipo: 'item',
      texto:
        'Os doces são perecíveis. Após a entrega ou retirada, a responsabilidade pela conservação (local fresco, longe do sol e de fontes de calor, e refrigeração quando indicado) passa a ser do CONTRATANTE ou do Buffet responsável.',
    },
    {
      tipo: 'item',
      texto:
        'As decorações podem conter elementos não comestíveis (como palitos, fitas, arames e suportes), que devem ser retirados antes do consumo.',
    },
    {
      tipo: 'item',
      texto:
        'A CONTRATADA não se responsabiliza por alterações nos doces causadas por armazenamento inadequado ou temperatura do ambiente da festa após a entrega.',
    },
    { tipo: 'secao', texto: '7. DISPOSIÇÕES GERAIS' },
    {
      tipo: 'paragrafo',
      texto:
        'As partes declaram estar de acordo com todas as cláusulas acima descritas. E, por estarem assim justas e contratadas, assinam o presente instrumento em duas vias de igual teor.',
    },
    ...rodape(),
  ]
}

export function montarContrato(pedido: Pedido, cliente: Cliente | null, dados: DadosContrato): Bloco[] {
  return dados.modelo === 'locacao' ? contratoLocacao(pedido, cliente, dados) : contratoDoces(pedido, cliente, dados)
}

/** Mensagem para o cliente responder "ACEITO" pelo WhatsApp. */
export function mensagemAceite(cliente: Cliente | null, pedido: Pedido): string {
  const nome = cliente?.nome.split(' ')[0] ?? ''
  return `Oi, ${nome}! Tudo bem? Te enviei o contrato da sua encomenda para o dia ${dataCurta(pedido.data_entrega)}. Por favor, leia com atenção e, se estiver tudo certo, responda esta mensagem com "ACEITO". Se preferir, você também pode assinar o PDF pelo gov.br e me devolver. Obrigada! 🧁`
}
