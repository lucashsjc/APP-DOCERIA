import type { Produto } from '../data/types'
import { formatarMoeda } from './format'

/** Seções do cardápio, na ordem em que aparecem, com o subtítulo do portfólio da loja. */
export const SECOES_CARDAPIO = [
  { nome: 'Brigadeiros premium', descricao: '18g · massa feita com a própria fruta' },
  { nome: 'Brigadeiros especiais', descricao: '18g' },
  { nome: 'Brigadeiros personalizados', descricao: '18g · sabor ninho, decorados com o tema da festa' },
  { nome: 'Doces 3D', descricao: 'Ricos em detalhes, decoração em alto relevo com modelagem.' },
  { nome: 'Doces 2D', descricao: 'Decorações planas, sem alto relevo.' },
  { nome: 'Topiarias', descricao: 'Torres personalizadas com o tema da festa.' },
  { nome: 'Adicionais', descricao: '' },
]

export const SEM_CATEGORIA = 'Outros'

/** Agrupa os produtos nas seções conhecidas (na ordem acima) e depois nas criadas por ela. */
export function agruparPorSecao(produtos: Produto[]) {
  const grupos = new Map<string, Produto[]>()
  for (const p of produtos) {
    const nome = p.categoria.trim() || SEM_CATEGORIA
    grupos.set(nome, [...(grupos.get(nome) ?? []), p])
  }
  const ordem = SECOES_CARDAPIO.map((s) => s.nome)
  return [...grupos.entries()]
    .sort(([a], [b]) => {
      const ia = ordem.indexOf(a) < 0 ? ordem.length + (a === SEM_CATEGORIA ? 1 : 0) : ordem.indexOf(a)
      const ib = ordem.indexOf(b) < 0 ? ordem.length + (b === SEM_CATEGORIA ? 1 : 0) : ordem.indexOf(b)
      return ia - ib || a.localeCompare(b, 'pt-BR')
    })
    .map(([nome, lista]) => ({
      nome,
      descricao: SECOES_CARDAPIO.find((s) => s.nome === nome)?.descricao ?? '',
      produtos: lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    }))
}

/** "R$ 350 o cento · R$ 175 meio cento" ou "R$ 28,50 un." */
export function precoDeVitrine(p: Pick<Produto, 'preco' | 'unidade'>): { principal: string; secundario?: string } {
  if (p.unidade === 'cento') {
    return { principal: `${formatarMoeda(p.preco * 100)} o cento`, secundario: `${formatarMoeda(p.preco * 50)} meio cento` }
  }
  return { principal: formatarMoeda(p.preco), secundario: 'unidade' }
}
