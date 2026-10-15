import { useCallback, useEffect, useState } from 'react'

/** Carrega dados assíncronos e expõe `recarregar` para depois de salvar. */
export function useCarregar<T>(carregar: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(carregar, deps)

  const recarregar = useCallback(() => {
    setErro(null)
    executar()
      .then(setDados)
      .catch((e: Error) => setErro(e.message))
  }, [executar])

  useEffect(recarregar, [recarregar])

  return { dados, erro, recarregar }
}
