/**
 * Proveniência de dados — o que convence a TI de que o dado é GOVERNADO, não presumido.
 *
 * Cada família de dado carrega: fonte, método de atualização, frescor,
 * confiabilidade, dono nomeado e regras de validação. Famílias 'tempo-real'
 * têm o frescor ligado ao tick global (liveStore); as demais registram a
 * última carga relativa à âncora do cenário (terça, 12 ago · 07:00).
 */
import type { FamiliaDado, FonteDado, RegraQualidadeDado, ResumoQualidadeDados } from './types'

export const FONTES: Record<FamiliaDado, FonteDado> = {
  preco: {
    familia: 'preco',
    rotulo: 'Preço do trigo',
    fonte: 'CBOT (CME) · Kansas City HRW — feed de mercado + curva futura',
    fonteCurta: 'CBOT',
    metodo: 'tempo-real',
    confiabilidade: 'alta',
    atualizadoEm: '2025-08-12T07:00:00',
    frescorRotulo: 'feed contínuo',
    responsavel: 'Mesa de Grãos · TI Dados',
    validacoes: [
      'Reconciliação com o ajuste oficial do pregão (D-1)',
      'Outlier acima de 3σ segura a publicação para revisão humana',
    ],
  },
  cambio: {
    familia: 'cambio',
    rotulo: 'Câmbio USD/BRL',
    fonte: 'B3 (spot e futuro) · PTAX + curva forward (NDF)',
    fonteCurta: 'B3',
    metodo: 'tempo-real',
    confiabilidade: 'alta',
    atualizadoEm: '2025-08-12T07:00:00',
    frescorRotulo: 'feed contínuo',
    responsavel: 'Tesouraria · TI Dados',
    validacoes: [
      'Dupla checagem PTAX × feed B3 (desvio máximo 0,1%)',
      'Curva forward validada contra os negócios da mesa',
    ],
  },
  frete: {
    familia: 'frete',
    rotulo: 'Frete marítimo',
    fonte: 'Índice Baltic Panamax + cotações diárias de armadores',
    fonteCurta: 'Baltic',
    metodo: 'diario',
    confiabilidade: 'media',
    atualizadoEm: '2025-08-12T06:15:00',
    frescorRotulo: 'hoje 06:15',
    responsavel: 'Logística · TI Dados',
    validacoes: [
      'Cotação de armador confrontada com o índice do dia',
      'ETA do armador × AIS dos navios — prevalece o pior caso',
    ],
  },
  safra: {
    familia: 'safra',
    rotulo: 'Safra & oferta',
    fonte: 'USDA (WASDE) · CONAB · Bolsa de Cereales (Buenos Aires)',
    fonteCurta: 'USDA/CONAB',
    metodo: 'diario',
    confiabilidade: 'alta',
    atualizadoEm: '2025-08-11T18:00:00',
    frescorRotulo: 'ontem 18:00',
    responsavel: 'Inteligência de Mercado',
    validacoes: [
      'Revisões mensais versionadas — nenhuma série é sobrescrita',
      'Divergência entre agências acima de 2% gera sinal de revisão',
    ],
  },
  estoque: {
    familia: 'estoque',
    rotulo: 'Estoque interno',
    fonte: 'ERP (SAP) — posição física + trânsito confirmado dos 7 moinhos',
    fonteCurta: 'ERP SAP',
    metodo: 'diario',
    confiabilidade: 'alta',
    atualizadoEm: '2025-08-12T06:30:00',
    frescorRotulo: 'hoje 06:30',
    responsavel: 'Supply · TI ERP',
    validacoes: [
      'Estoque físico × contábil reconciliado no inventário rotativo',
      'Cobertura = física + trânsito confirmado (nunca previsão de chegada)',
    ],
  },
  qualidade: {
    familia: 'qualidade',
    rotulo: 'Qualidade do grão',
    fonte: 'Laudos por lote (SGS/Intertek) + laboratório interno dos moinhos',
    fonteCurta: 'Laudo SGS',
    metodo: 'contrato',
    confiabilidade: 'media',
    atualizadoEm: '2025-08-10T14:20:00',
    frescorRotulo: '10 ago · 14:20',
    responsavel: 'Qualidade industrial',
    validacoes: [
      'Proteína, W, FN, PH e DON validados contra a faixa da espec',
      'Laudo pré-embarque × contraprova no desembarque',
    ],
  },
  alertas: {
    familia: 'alertas',
    rotulo: 'Alertas & trilha de decisão',
    fonte: 'Motor de regras do Hub — derivado das fontes acima, recalculado a cada sinal',
    fonteCurta: 'Hub',
    metodo: 'tempo-real',
    confiabilidade: 'alta',
    atualizadoEm: '2025-08-12T07:00:00',
    frescorRotulo: 'recálculo contínuo',
    responsavel: 'Torre de Controle · TI Dados',
    validacoes: [
      'Todo alerta referencia a fonte e o limiar que o disparou',
      'Trilha de decisão imutável (append-only) para auditoria',
    ],
  },
}

export const FONTES_LISTA: readonly FonteDado[] = Object.values(FONTES)

export const fonteDe = (familia: FamiliaDado): FonteDado => FONTES[familia]

/**
 * Fonte do câmbio AO VIVO (periferia): quando o modo de dados é "Ao vivo",
 * o SourceBadge do câmbio troca a fonte encenada (B3) por esta.
 */
export const FONTE_FRANKFURTER: FonteDado = {
  familia: 'cambio',
  rotulo: 'Câmbio USD/BRL — ao vivo',
  fonte: 'Frankfurter — taxas de referência de bancos centrais (BCE)',
  fonteCurta: 'Frankfurter',
  metodo: 'tempo-real',
  confiabilidade: 'alta',
  atualizadoEm: '2025-08-12T07:00:00',
  frescorRotulo: 'refetch a cada 60s',
  responsavel: 'TI Dados (periferia ao vivo)',
  validacoes: [
    'Timeout de 6s + try/catch — qualquer falha cai no cenário (R$ 5,20)',
    'Nenhum número de decisão consome esta fonte (núcleo encenado)',
  ],
}

/**
 * Amostra das regras de validação em execução — as que importam hoje.
 * Os avisos abertos são exatamente os desta lista (coerência com o resumo).
 */
export const REGRAS_QUALIDADE_DADOS: readonly RegraQualidadeDado[] = [
  {
    id: 'dq-don-russia',
    familia: 'qualidade',
    regra: 'Laudo pré-embarque × espec do blend',
    status: 'aviso',
    detalhe: 'DON 1.900 ppb no lote Rússia acima da faixa — lote bloqueado no comparador de TLC',
    responsavel: 'Qualidade industrial',
  },
  {
    id: 'dq-eta-rio-parana',
    familia: 'frete',
    regra: 'ETA do armador × AIS do navio',
    status: 'aviso',
    detalhe: 'MV Río Paraná: armador reporta +6 dias, AIS sugere +5 — o TLC precifica o pior caso',
    responsavel: 'Logística',
  },
  {
    id: 'dq-ptax-b3',
    familia: 'cambio',
    regra: 'PTAX × feed B3 (desvio máx. 0,1%)',
    status: 'ok',
    detalhe: 'Sem desvio na última verificação',
    responsavel: 'Tesouraria',
  },
  {
    id: 'dq-estoque-reconciliacao',
    familia: 'estoque',
    regra: 'Estoque físico × contábil por moinho',
    status: 'ok',
    detalhe: '7/7 moinhos reconciliados na carga de hoje (06:30)',
    responsavel: 'Supply',
  },
  {
    id: 'dq-ajuste-pregao',
    familia: 'preco',
    regra: 'Feed intradiário × ajuste oficial D-1',
    status: 'ok',
    detalhe: 'Reconciliado sem ajuste manual',
    responsavel: 'Mesa de Grãos',
  },
  {
    id: 'dq-safra-versionada',
    familia: 'safra',
    regra: 'Revisão de safra versionada (sem sobrescrita)',
    status: 'ok',
    detalhe: 'WASDE de 12 ago incorporado como nova versão da série',
    responsavel: 'Inteligência de Mercado',
  },
]

const contar = (status: RegraQualidadeDado['status']) =>
  REGRAS_QUALIDADE_DADOS.filter((r) => r.status === status).length

export const RESUMO_QUALIDADE_DADOS: ResumoQualidadeDados = {
  /** Total no motor de validação; a lista acima é a amostra do dia. */
  regrasAtivas: 18,
  avisosAbertos: contar('aviso'),
  falhasAbertas: contar('falha'),
  fontesComDonoPct: 100,
}
