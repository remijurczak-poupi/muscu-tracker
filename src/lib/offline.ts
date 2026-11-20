import { supabase } from './supabase'

const OUTBOX_KEY = 'muscu-tracker-outbox-v1'
const CACHE_PREFIX = 'muscu-tracker-cache-v1:'
const CHANGE_EVENT = 'muscu-outbox-changed'

type PendingOp =
  | { queueId: string; table: string; op: 'insert'; row: Record<string, unknown> }
  | { queueId: string; table: string; op: 'delete'; deleteId: string }

function readOutbox(): PendingOp[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    return raw ? (JSON.parse(raw) as PendingOp[]) : []
  } catch {
    return []
  }
}

function writeOutbox(items: PendingOp[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
  } catch {
    // stockage indisponible, tant pis
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** S'abonner aux changements de la file (nouvel ajout, suppression, synchro) pour rafraîchir l'UI. */
export function onOutboxChange(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb)
  window.addEventListener('online', cb)
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb)
    window.removeEventListener('online', cb)
  }
}

/** Enregistre une création en attente (survit à un rechargement de page hors-ligne). */
export function queueInsert(table: string, row: Record<string, unknown>) {
  const items = readOutbox()
  items.push({ queueId: `${table}:${row.id}:${Date.now()}`, table, op: 'insert', row })
  writeOutbox(items)
}

/** Annule une création pas encore synchronisée, ou programme la suppression si elle l'est déjà. */
export function queueDelete(table: string, id: string) {
  const items = readOutbox()
  const stillPending = items.some((i) => i.op === 'insert' && i.table === table && i.row.id === id)
  const filtered = items.filter((i) => !(i.op === 'insert' && i.table === table && i.row.id === id))
  if (!stillPending) {
    filtered.push({ queueId: `${table}:${id}:del:${Date.now()}`, table, op: 'delete', deleteId: id })
  }
  writeOutbox(filtered)
}

export function isPending(table: string, id: string): boolean {
  return readOutbox().some((i) => i.op === 'insert' && i.table === table && i.row.id === id)
}

/** Modifie une ligne encore en attente de synchro (ex: marquer une séance comme terminée). */
export function updatePendingInsert(table: string, id: string, patch: Record<string, unknown>) {
  const items = readOutbox().map((i) =>
    i.op === 'insert' && i.table === table && i.row.id === id ? { ...i, row: { ...i.row, ...patch } } : i,
  )
  writeOutbox(items)
}

/** Retire une ligne en attente sans jamais l'avoir envoyée (ex: séance annulée avant synchro). */
export function cancelPendingInsert(table: string, id: string) {
  writeOutbox(readOutbox().filter((i) => !(i.op === 'insert' && i.table === table && i.row.id === id)))
}

export function outboxSize(): number {
  return readOutbox().length
}

export function getPendingInserts<T = Record<string, unknown>>(table: string): T[] {
  return readOutbox()
    .filter((i): i is Extract<PendingOp, { op: 'insert' }> => i.op === 'insert' && i.table === table)
    .map((i) => i.row as T)
}

/**
 * Rejoue la file dans l'ordre (une session avant ses séries, etc.) ; s'arrête à la première panne réseau.
 *
 * supabase-js n'envoie PAS d'exception quand fetch échoue (hors-ligne, DNS, etc.) : il la capture et la
 * renvoie comme `error` normal, avec un `code` vide ("") — à la différence d'une vraie erreur Postgrest/
 * Postgres, qui a toujours un code. C'est le seul moyen fiable de distinguer "pas de réseau, à réessayer"
 * d'une erreur définitive côté serveur qu'il ne sert à rien de rejouer.
 */
let flushing = false
export async function flushOutbox() {
  if (flushing) return
  flushing = true
  try {
    for (;;) {
      const items = readOutbox()
      if (items.length === 0) break
      const item = items[0]
      let ok = false
      let networkFailure = false
      try {
        const { error } =
          item.op === 'insert'
            ? await supabase.from(item.table).insert(item.row)
            : await supabase.from(item.table).delete().eq('id', item.deleteId)
        if (error) {
          if (!error.code) networkFailure = true
        } else {
          ok = true
        }
      } catch {
        networkFailure = true
      }
      if (networkFailure) break
      // synchronisé, ou erreur définitive (pas réseau) qu'il est inutile de rejouer indéfiniment
      writeOutbox(readOutbox().filter((i) => i.queueId !== item.queueId))
      if (!ok) break
    }
  } finally {
    flushing = false
  }
}

export function cacheSet(key: string, value: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value))
  } catch {
    // stockage indisponible, tant pis
  }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
