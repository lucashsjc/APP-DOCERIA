import type { ReactNode } from 'react'

// Ícones de traço, no estilo dos ícones da referência. Herdam a cor do texto.
function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}


export const IconeAgenda = () => (
  <Icone>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icone>
)

export const IconeClientes = () => (
  <Icone>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icone>
)

export const IconeFinanceiro = () => (
  <Icone>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20M16 15h2" />
  </Icone>
)


export const IconeMoeda = () => (
  <Icone>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5M12 6.5V8M12 16v1.5" />
  </Icone>
)

export const IconeCardapio = () => (
  <Icone>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="M9 7h7M9 11h5" />
  </Icone>
)

export const IconeMais = () => (
  <Icone>
    <path d="M12 5v14M5 12h14" />
  </Icone>
)

export const IconeInicio = () => (
  <Icone>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Icone>
)

export const IconeSino = () => (
  <Icone>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icone>
)

export const IconeProducao = () => (
  <Icone>
    <path d="M9 11V3h6v8M5 11h14l-1 10H6z" />
  </Icone>
)

export const IconeSeta = () => (
  <Icone>
    <path d="M7 17 17 7M8 7h9v9" />
  </Icone>
)
