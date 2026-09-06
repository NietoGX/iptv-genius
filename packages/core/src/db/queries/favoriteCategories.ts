import type { Database } from 'better-sqlite3'

export interface FavoriteCategory {
  sourceId: number
  groupTitle: string | null
}

export function createFavoriteCategoriesRepo(db: Database) {
  return {
    add(sourceId: number, groupTitle: string | null): void {
      // SQLite's `IS` operator does NULL-safe comparison, unlike `=` —
      // needed since group_title is often NULL ("Sin categoría").
      const exists = db
        .prepare('SELECT 1 FROM favorite_categories WHERE source_id = ? AND group_title IS ?')
        .get(sourceId, groupTitle)
      if (!exists) {
        db.prepare(
          'INSERT INTO favorite_categories (source_id, group_title, created_at) VALUES (?, ?, ?)'
        ).run(sourceId, groupTitle, Date.now())
      }
    },

    remove(sourceId: number, groupTitle: string | null): void {
      db.prepare(
        'DELETE FROM favorite_categories WHERE source_id = ? AND group_title IS ?'
      ).run(sourceId, groupTitle)
    },

    listForSource(sourceId: number): FavoriteCategory[] {
      const rows = db
        .prepare('SELECT source_id, group_title FROM favorite_categories WHERE source_id = ?')
        .all(sourceId) as { source_id: number; group_title: string | null }[]
      return rows.map((r) => ({ sourceId: r.source_id, groupTitle: r.group_title }))
    }
  }
}

export type FavoriteCategoriesRepo = ReturnType<typeof createFavoriteCategoriesRepo>
