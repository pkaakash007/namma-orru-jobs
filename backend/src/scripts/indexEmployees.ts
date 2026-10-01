/**
 * Safe Batch Indexing Script for Employee Candidates
 * Generates and stores multilingual semantic embeddings for existing employee records.
 * 
 * Features:
 * - Batched processing (50 records per chunk)
 * - Safe cursor pagination (avoids memory spikes)
 * - Error isolation per employee (one failure does not break the batch)
 * - Non-destructive (does NOT alter any existing user data)
 * - Progress logging
 */

import {
  getEmbedding,
  buildEmployeeSearchableText,
} from '../services/embeddingService'

export interface BatchIndexOptions {
  batchSize?: number
  forceReindex?: boolean
  onProgress?: (processed: number, total: number) => void
}

export interface BatchIndexResult {
  totalEmployees: number
  indexedCount: number
  skippedCount: number
  failedCount: number
  errors: Array<{ userId: string; error: string }>
}

/**
 * Executes a batched indexing run against a database connection
 */
export async function batchIndexEmployees(
  db: any,
  options: BatchIndexOptions = {}
): Promise<BatchIndexResult> {
  const batchSize = Math.max(1, Math.min(100, options.batchSize || 50))
  const forceReindex = options.forceReindex === true

  const result: BatchIndexResult = {
    totalEmployees: 0,
    indexedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  }

  // 1. Ensure employee_search_index table exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS employee_search_index (
      employee_id TEXT PRIMARY KEY,
      search_text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run().catch(() => {})

  // 2. Count total employees to index
  const countRow = await db.prepare(
    "SELECT COUNT(*) as total FROM users WHERE role = 'employee' AND (status IS NULL OR status = 'active')"
  ).first().catch(() => ({ total: 0 }))

  const total = Number(countRow?.total ?? countRow?.count ?? 0)
  result.totalEmployees = total

  if (total === 0) {
    return result
  }

  console.log(`[Batch Indexer] Starting indexing of ${total} employees (batch size: ${batchSize})...`)

  let offset = 0

  while (offset < total) {
    let usersQuery = `
      SELECT id, full_name, role, status, headline, avatar_url, bio,
             location, company, position, skills, phone, language
      FROM users
      WHERE role = 'employee' AND (status IS NULL OR status = 'active')
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `

    const { results: batch } = await db.prepare(usersQuery).bind(batchSize, offset).all()
    if (!batch || batch.length === 0) {
      break
    }

    for (const user of batch) {
      try {
        // If not forceReindex, check if already indexed recently
        if (!forceReindex) {
          const existing = await db.prepare(
            'SELECT employee_id FROM employee_search_index WHERE employee_id = ?'
          ).bind(user.id).first().catch(() => null)

          if (existing) {
            result.skippedCount++
            continue
          }
        }

        const searchText = buildEmployeeSearchableText(user)
        const embedding = await getEmbedding(searchText)
        const embeddingJson = JSON.stringify(embedding)

        await db.prepare(`
          INSERT INTO employee_search_index (employee_id, search_text, embedding, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(employee_id) DO UPDATE SET
            search_text = excluded.search_text,
            embedding = excluded.embedding,
            updated_at = CURRENT_TIMESTAMP
        `).bind(user.id, searchText, embeddingJson).run()

        result.indexedCount++
      } catch (err: any) {
        result.failedCount++
        result.errors.push({
          userId: user.id,
          error: err.message || String(err),
        })
        console.warn(`[Batch Indexer] Failed indexing user ${user.id}:`, err.message)
      }
    }

    offset += batch.length
    if (options.onProgress) {
      options.onProgress(Math.min(offset, total), total)
    }
    console.log(`[Batch Indexer] Progress: ${Math.min(offset, total)} / ${total}`)
  }

  console.log(
    `[Batch Indexer] Finished. Indexed: ${result.indexedCount}, Skipped: ${result.skippedCount}, Failed: ${result.failedCount}`
  )

  return result
}
