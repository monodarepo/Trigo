import type { TipoObjeto } from '../../data/objects'

export const EVENTO_OBJETO = 'torre:abrir-objeto'

export interface AbrirObjetoDetail {
  tipo: TipoObjeto
  id: string
}

/** Abre o painel de objeto de qualquer lugar do app. */
export function abrirObjeto(tipo: TipoObjeto, id: string) {
  window.dispatchEvent(new CustomEvent<AbrirObjetoDetail>(EVENTO_OBJETO, { detail: { tipo, id } }))
}
