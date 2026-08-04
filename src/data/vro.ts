import type { RegistroVRO } from './types'

/** Trilha de valor capturado pelas decisões do hub em 2025 (VRO). */
export const REGISTROS_VRO: RegistroVRO[] = [
  {
    id: 'vro-2025-03',
    data: '2025-03-14',
    categoria: 'compra',
    decisao: 'Antecipação de 40.000 t do Canadá antes do rali de março',
    valorCapturadoRs: 6_200_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-04',
    data: '2025-04-22',
    categoria: 'blend',
    decisao: 'Blend soft nacional em biscoitos (W 160) substituindo importado',
    valorCapturadoRs: 3_100_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-05',
    data: '2025-05-09',
    categoria: 'hedge',
    decisao: 'NDF de US$ 38M no T2 antes da alta do dólar',
    valorCapturadoRs: 5_400_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-06',
    data: '2025-06-18',
    categoria: 'logistica',
    decisao: 'Redirecionamento Suape → Pecém em duas descargas',
    valorCapturadoRs: 2_800_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-07',
    data: '2025-07-25',
    categoria: 'logistica',
    decisao: 'Renegociação de demurrage e janela de atracação em Aratu',
    valorCapturadoRs: 1_900_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-08',
    data: '2025-08-12',
    categoria: 'compra',
    decisao: 'Recomendação do dia: antecipar 18% do trimestre + hedge de 60%',
    valorCapturadoRs: 4_800_000,
    status: 'projetado',
  },
]

/** Valor realizado no ano (exclui projeções). */
export const VALOR_CAPTURADO_YTD_RS = REGISTROS_VRO.filter((r) => r.status === 'realizado').reduce(
  (soma, r) => soma + r.valorCapturadoRs,
  0,
)
