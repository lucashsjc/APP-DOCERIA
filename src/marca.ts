// Identidade da loja. As cores ficam no topo de src/index.css (--marca, --acento…).
// Ao trocar o nome, atualize também <title> e apple-mobile-web-app-title em index.html
// e "name"/"short_name" em public/manifest.webmanifest.
export const NOME_LOJA = 'Doce Festa'
export const SUBTITULO_LOJA = 'Confeitaria Artística'
/** Nome da dona, usado na saudação da tela inicial. */
export const NOME_DONA = 'Pamela'

// Dados usados nos contratos. Os da contratada ficam em branco (linha para preencher
// à mão) enquanto não forem informados.
export const CONTRATO = {
  cidade: 'São José dos Campos',
  contratada: { nome: '', documento: '', endereco: '', telefone: '' },
  /** Locação: valor de reposição da base cenográfica e multa por dia de atraso na devolução. */
  valorReposicao: 1000,
  multaPorDia: 100,
  /** Encomenda de doces: pedido mínimo por item (exceções pelo nome do produto). */
  pedidoMinimo: 6,
  pedidoMinimoExcecoes: [{ produto: 'Cilindro cake', minimo: 3 }],
}
