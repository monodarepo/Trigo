import { useEffect, useRef, useState } from 'react'

export interface AnimatedNumberProps {
  valor: number
  /** Formata o valor exibido (ex.: casas decimais pt-BR). */
  formatar: (v: number) => string
  duracaoMs?: number
  /** Conta a partir de 0 na montagem (KPIs de entrada). */
  deZero?: boolean
  className?: string
}

/**
 * Número que desliza do valor anterior ao novo (rAF + ease-out cúbico).
 * Com prefers-reduced-motion, salta direto para o alvo.
 */
export function AnimatedNumber({ valor, formatar, duracaoMs = 600, deZero = false, className = '' }: AnimatedNumberProps) {
  const [exibido, setExibido] = useState(deZero ? 0 : valor)
  const anterior = useRef(deZero ? 0 : valor)

  useEffect(() => {
    const de = anterior.current
    anterior.current = valor
    if (de === valor) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setExibido(valor)
      return
    }
    let raf = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      // Piso além do teto: sem o Math.max, um relógio que ande para trás
      // (tempo virtual, aba suspensa) faz p<0, o ease-out fica negativo e o
      // número atravessa o zero — um câmbio de R$ −1,57 no ticker.
      const p = Math.max(0, Math.min(1, (agora - inicio) / duracaoMs))
      const easeOut = 1 - Math.pow(1 - p, 3)
      setExibido(de + (valor - de) * easeOut)
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    /**
     * Rede de segurança: se o rAF não correr (aba em segundo plano na hora do
     * load, tempo virtual, renderizador headless), o número congela no ponto de
     * partida. Com `deZero` isso significa exibir "R$ 0" no lugar da âncora —
     * um valor ERRADO, não uma animação ausente. O timer garante o pouso.
     */
    const garantia = setTimeout(() => setExibido(valor), duracaoMs + 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(garantia)
    }
  }, [valor, duracaoMs])

  return <span className={`tnums ${className}`}>{formatar(exibido)}</span>
}
