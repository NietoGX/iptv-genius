import type { Source } from '@iptv-genius/core/src/portable'
import { getDatabase } from './db'
import {
  importM3uSource,
  importXtreamSource,
  refreshSource,
  type AddM3uInput,
  type AddM3uResult,
  type AddXtreamInput
} from './importSource'

export async function listSources(): Promise<Source[]> {
  const db = await getDatabase()
  return db.sources.list()
}

export async function addM3uSource(input: AddM3uInput): Promise<AddM3uResult> {
  const db = await getDatabase()
  return importM3uSource(db, input)
}

export async function addXtreamSource(input: AddXtreamInput): Promise<Source> {
  const db = await getDatabase()
  return importXtreamSource(db, input)
}

export async function removeSource(id: number): Promise<void> {
  const db = await getDatabase()
  await db.sources.remove(id)
}

export async function refreshSourceById(id: number): Promise<void> {
  const db = await getDatabase()
  await refreshSource(db, id)
}
