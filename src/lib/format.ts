const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor: number): string {
  return moeda.format(valor)
}

/** Aceita "12,50", "12.50", "1.234,56" e "R$ 10". Devolve 0 se não der para entender. */
export function lerMoeda(texto: string): number {
  let limpo = texto.replace(/[^\d,.-]/g, '')
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  const valor = Number(limpo)
  return Number.isFinite(valor) ? valor : 0
}

/** Para preencher um campo de valor: 12.5 → "12,50"; 0 → "". */
export function moedaParaCampo(valor: number): string {
  return valor ? valor.toFixed(2).replace('.', ',') : ''
}

function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

export function hojeIso(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** "sáb., 18 de out." */
export function formatarData(iso: string): string {
  return dataLocal(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "Hoje", "Amanhã", "Ontem" ou a data por extenso. */
export function formatarDataRelativa(iso: string): string {
  const dias = Math.round((dataLocal(iso).getTime() - dataLocal(hojeIso()).getTime()) / 86_400_000)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  if (dias === -1) return 'Ontem'
  return formatarData(iso)
}

/** Só os dígitos, com o 55 do Brasil quando faltar. */
export function telefoneWhatsApp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '')
  return digitos.length <= 11 ? `55${digitos}` : digitos
}

/** "outubro de 2026" */
export function formatarMes(anoMes: string): string {
  return dataLocal(`${anoMes}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** Link do WhatsApp com a mensagem já escrita. */
export function linkWhatsApp(telefone: string, mensagem?: string): string {
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
  return `https://wa.me/${telefoneWhatsApp(telefone)}${texto}`
}
