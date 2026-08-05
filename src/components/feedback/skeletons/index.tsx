/**
 * Skeletons POR LAYOUT: cada um espelha a estrutura real da tela
 * (nada de spinner genérico). Shimmer sutil via classe .skeleton;
 * reduced-motion desliga a animação pelo kill-switch global.
 */

function Caixa({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-card border border-edge/40 ${className}`} aria-hidden="true" />
}

function Linha({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} aria-hidden="true" />
}

function Cabecalho() {
  return (
    <div className="space-y-2">
      <Linha className="h-3 w-28" />
      <Linha className="h-7 w-72 max-w-full" />
      <Linha className="h-3.5 w-96 max-w-full" />
    </div>
  )
}

function GradeKpis({ n, altura = 'h-28', cols }: { n: number; altura?: string; cols: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: n }, (_, i) => (
        <Caixa key={i} className={altura} />
      ))}
    </div>
  )
}

export function EsqueletoCockpit() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <div className="space-y-6 wide:grid wide:grid-cols-3 wide:items-start wide:gap-4 wide:space-y-0">
        <Caixa className="h-64 wide:col-span-2" />
        <GradeKpis n={6} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 wide:grid-cols-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 wide:grid-cols-4">
        <Caixa className="h-96" />
        <Caixa className="h-96" />
        <Caixa className="h-72" />
        <Caixa className="h-72" />
      </div>
      <Caixa className="h-64" />
    </div>
  )
}

export function EsqueletoPrevisao() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <div className="grid gap-4 lg:grid-cols-3">
        <Caixa className="h-[420px] lg:col-span-2" />
        <Caixa className="h-[420px]" />
        <Caixa className="h-72 lg:col-span-2" />
        <Caixa className="h-72" />
      </div>
      <Caixa className="h-16" />
    </div>
  )
}

export function EsqueletoTlc() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <Caixa className="h-24" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Caixa className="h-[440px] lg:col-span-2" />
        <Caixa className="h-[440px]" />
      </div>
      <Caixa className="h-24" />
      <Caixa className="h-72" />
    </div>
  )
}

export function EsqueletoCompra() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <Caixa className="h-72" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Caixa className="h-56" />
        <Caixa className="h-56" />
      </div>
      <Caixa className="h-80" />
    </div>
  )
}

export function EsqueletoHedge() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <GradeKpis n={4} cols="grid-cols-2 xl:grid-cols-4" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Caixa className="h-96" />
        <Caixa className="h-96" />
        <Caixa className="h-72" />
        <Caixa className="h-72" />
      </div>
    </div>
  )
}

export function EsqueletoSimulador() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <div className="grid gap-4 lg:grid-cols-3">
        <Caixa className="h-[540px]" />
        <div className="space-y-4 lg:col-span-2">
          <Caixa className="h-40" />
          <Caixa className="h-72" />
          <Caixa className="h-40" />
        </div>
      </div>
    </div>
  )
}

export function EsqueletoAlertas() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <GradeKpis n={4} altura="h-24" cols="grid-cols-2 xl:grid-cols-4" />
      <Caixa className="h-12" />
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Caixa key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}

export function EsqueletoCopiloto() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <div className="grid gap-4 lg:grid-cols-3">
        <Caixa className="h-[540px] lg:col-span-2" />
        <Caixa className="h-[540px]" />
      </div>
    </div>
  )
}

export function EsqueletoVro() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <GradeKpis n={5} cols="grid-cols-2 md:grid-cols-3 xl:grid-cols-5" />
      <Caixa className="h-96" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Caixa className="h-[420px]" />
        <Caixa className="h-[420px]" />
      </div>
    </div>
  )
}

export function EsqueletoSinais() {
  return (
    <div className="space-y-6">
      <Cabecalho />
      <Caixa className="h-24" />
      <GradeKpis n={4} altura="h-72" cols="grid-cols-1 md:grid-cols-2" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Caixa className="h-72 lg:col-span-2" />
        <Caixa className="h-72" />
      </div>
    </div>
  )
}
