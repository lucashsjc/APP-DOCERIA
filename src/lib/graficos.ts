/** Utilidades de desenho dos gráficos (SVG). */

export type Ponto = [number, number]

/**
 * Curva suave que passa pelos pontos sem "ultrapassar" os valores (monotônica, Fritsch–Carlson):
 * um dia sem vendas nunca vira valor negativo no desenho.
 */
export function curvaSuave(pontos: Ponto[], inicio: 'M' | 'L' = 'M'): string {
  const n = pontos.length
  if (n === 0) return ''
  if (n === 1) return `${inicio}${pontos[0][0]},${pontos[0][1]}`
  const dx: number[] = []
  const inc: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pontos[i + 1][0] - pontos[i][0])
    inc.push((pontos[i + 1][1] - pontos[i][1]) / (dx[i] || 1))
  }
  const t: number[] = [inc[0]]
  for (let i = 1; i < n - 1; i++) t.push(inc[i - 1] * inc[i] <= 0 ? 0 : (inc[i - 1] + inc[i]) / 2)
  t.push(inc[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (inc[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / inc[i]
    const b = t[i + 1] / inc[i]
    const h = a * a + b * b
    if (h > 9) {
      const k = 3 / Math.sqrt(h)
      t[i] = k * a * inc[i]
      t[i + 1] = k * b * inc[i]
    }
  }
  let d = `${inicio}${pontos[0][0]},${pontos[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pontos[i]
    const [x1, y1] = pontos[i + 1]
    const h = dx[i] / 3
    d += ` C${x0 + h},${y0 + t[i] * h} ${x1 - h},${y1 - t[i + 1] * h} ${x1},${y1}`
  }
  return d
}

/** Teto do eixo em número redondo (0 / 500 / 1 mil…). */
export function topoDoEixo(max: number): number {
  if (max <= 0) return 100
  const passo = 10 ** Math.floor(Math.log10(max))
  const r = max / passo
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * passo
}

/** 1.234 → "1,2 mil" */
export function compacto(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return Math.round(v).toLocaleString('pt-BR')
}
