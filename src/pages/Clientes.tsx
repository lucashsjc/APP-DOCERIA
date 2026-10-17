import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { useCarregar } from '../lib/useCarregar'

export default function Clientes() {
  const [busca, setBusca] = useState('')
  const { dados, erro } = useCarregar(
    () => Promise.all([repo.listarClientes(), repo.listarPedidos()]),
    [],
  )

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const clientes = (dados?.[0] ?? []).filter(
    (c) => !termo || `${c.nome} ${c.telefone}`.toLocaleLowerCase('pt-BR').includes(termo),
  )
  const pedidosPorCliente = new Map<string, number>()
  for (const p of dados?.[1] ?? []) {
    pedidosPorCliente.set(p.cliente_id, (pedidosPorCliente.get(p.cliente_id) ?? 0) + 1)
  }

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        acao={
          <Link to="/clientes/novo" className="botao primario pequeno">
            + Novo
          </Link>
        }
      />
      <input
        className="busca"
        type="search"
        placeholder="Buscar por nome ou telefone"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <Estado erro={erro} carregando={!dados} />
      {dados && clientes.length === 0 && <p className="vazio">Nenhum cliente encontrado.</p>}
      <div className="lista">
        {clientes.map((c) => {
          const qtd = pedidosPorCliente.get(c.id) ?? 0
          return (
            <Link key={c.id} to={`/clientes/${c.id}`} className="cartao">
              <div className="linha">
                <strong>{c.nome}</strong>
                <span className="suave">
                  {qtd} {qtd === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
              {c.telefone && <div className="suave">{c.telefone}</div>}
            </Link>
          )
        })}
      </div>
    </>
  )
}
