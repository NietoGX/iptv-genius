import type { DB } from '@op-engineering/op-sqlite'

export interface FavoriteCategory {
  sourceId: number
  groupTitle: string | null
}

export function createFavoriteCategoriesRepo(db: DB) {
  return {
    async add(sourceId: number, groupTitle: string | null): Promise<void> {
      // SQLite's `IS` operator does NULL-safe comparison, unlike `=` —
      // needed since group_title is often NULL ("Sin categoría").
      const { rows } = await db.execute(
        'SELECT 1 FROM favorite_categories WHERE source_id = ? AND group_title IS ?',
        [sourceId, groupTitle]
      )
      if (rows.length === 0) {
        await db.execute(
          'INSERT INTO favorite_categories (source_id, group_title, created_at) VALUES (?, ?, ?)',
          [sourceId, groupTitle, Date.now()]
        )
      }
    },

    async remove(sourceId: number, groupTitle: string | null): Promise<void> {
      await db.execute('DELETE FROM favorite_categories WHERE source_id = ? AND group_title IS ?', [
        sourceId,
        groupTitle
      ])
    },

    async listForSource(sourceId: number): Promise<FavoriteCategory[]> {
      const { rows } = await db.execute(
        'SELECT source_id, group_title FROM favorite_categories WHERE source_id = ?',
        [sourceId]
      )
      return (rows as unknown as { source_id: number; group_title: string | null }[]).map((r) => ({
        sourceId: r.source_id,
        groupTitle: r.group_title
      }))
    }
  }
}

export type FavoriteCategoriesRepo = ReturnType<typeof createFavoriteCategoriesRepo>
