/**
 * ANÚNCIO PARA LEITORES DE TELA — o alerta que chega tem cor, toast e badge;
 * sem esta região, não tem voz.
 *
 * Duas polidezes, porque a diferença é real para quem navega por áudio:
 *  · CRÍTICO usa `role="alert"` (assertive): interrompe a leitura em curso,
 *    que é exatamente o que "exige ação imediata" significa.
 *  · O resto usa `role="status"` (polite): entra na fila e é lido quando a
 *    pessoa terminar o que está ouvindo. Interromper para anunciar uma cotação
 *    comparável de farinha seria o equivalente sonoro de um pop-up.
 *
 * Anuncia só o que CHEGOU nesta sessão (`recebidoEmS`): sem esse filtro, os 20
 * alertas semeados seriam lidos em voz alta na montagem da página.
 */
import { useEffect, useRef, useState } from 'react'
import { useListaAlertas } from './alertStore'
import { SEVERIDADE_UI } from './severidade'
import { formatBRL } from '../data/format'

export function AlertLiveRegion() {
  const lista = useListaAlertas()
  const [assertivo, setAssertivo] = useState('')
  const [educado, setEducado] = useState('')
  const anunciados = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const a of lista) {
      if (a.recebidoEmS == null || anunciados.current.has(a.id)) continue
      anunciados.current.add(a.id)
      const impacto =
        a.impactoRs != null
          ? `, ${a.tipo === 'oportunidade' ? 'oportunidade de' : 'risco de'} ${formatBRL(a.impactoRs, { compacto: true })}`
          : ''
      const texto = `Novo alerta ${SEVERIDADE_UI[a.severidade].rotulo.toLowerCase()}: ${a.titulo}${impacto}.`
      if (a.severidade === 'critico') setAssertivo(texto)
      else setEducado(texto)
    }
  }, [lista])

  return (
    <>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertivo}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {educado}
      </div>
    </>
  )
}
