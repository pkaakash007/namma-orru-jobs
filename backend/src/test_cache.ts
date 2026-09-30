import app from './index'
import { getEdgeCache, setEdgeCache, invalidateEdgeCache, clearEdgeCache } from './index'

declare const process: any

async function runCacheTests() {
  console.log('\n================================================================')
  console.log('  NAMMA OORU JOBS: CLOUDFLARE D1 QUERY OPTIMIZATION & CACHE TESTS')
  console.log('================================================================\n')

  let passed = 0
  let total = 0

  function assert(condition: boolean, msg: string) {
    total++
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${msg}`)
      process.exit(1)
    }
  }

  clearEdgeCache()

  // 1. Direct Edge Cache Unit Test
  setEdgeCache('test:key', { foo: 'bar' }, 2)
  const cached = getEdgeCache<{ foo: string }>('test:key')
  assert(cached !== null && cached.foo === 'bar', 'Edge cache stores and retrieves memory data')

  // Invalidation test
  invalidateEdgeCache('test:')
  const afterInvalidate = getEdgeCache('test:key')
  assert(afterInvalidate === null, 'Edge cache prefix invalidation clears targeted entries')

  // 2. Mock D1 Database to trace number of database queries executed
  let d1PrepareCount = 0
  const mockD1 = {
    prepare(query: string) {
      d1PrepareCount++
      return {
        bind(..._args: any[]) {
          return this
        },
        async first(key?: string) {
          if (key === 'count') return 15
          return null
        },
        async all() {
          return { results: [] }
        },
        async run() {
          return { success: true }
        },
      }
    },
  }

  const mockEnv = {
    DB: mockD1 as any,
    MEDIA_BUCKET: {} as any,
    JWT_SECRET: 'test-secret',
  }

  clearEdgeCache()

  // Call 1: GET /api/jobs for unregistered visitor (should query D1)
  d1PrepareCount = 0
  const res1 = await app.request('/api/jobs', { method: 'GET' }, mockEnv)
  assert(res1.status === 200, 'GET /api/jobs returns 200')
  const countAfterCall1 = d1PrepareCount
  assert(countAfterCall1 > 0, `Call 1 queries D1 database (executed ${countAfterCall1} prepare calls)`)

  // Call 2: GET /api/jobs again within 60s (SHOULD HIT EDGE CACHE with 0 new D1 queries!)
  const preCall2Count = d1PrepareCount
  const res2 = await app.request('/api/jobs', { method: 'GET' }, mockEnv)
  assert(res2.status === 200, 'GET /api/jobs (cached) returns 200')
  const newQueriesCall2 = d1PrepareCount - preCall2Count
  assert(newQueriesCall2 === 0, `Call 2 hits edge memory cache with ZERO D1 queries! (Saved 100% database reads)`)

  // Call 3: GET /api/platform/overview (should query D1 once)
  const preOverview1 = d1PrepareCount
  const ov1 = await app.request('/api/platform/overview', { method: 'GET' }, mockEnv)
  assert(ov1.status === 200, 'GET /api/platform/overview returns 200')
  const ov1Queries = d1PrepareCount - preOverview1
  assert(ov1Queries > 0, `Overview Call 1 queried D1 (${ov1Queries} queries)`)

  // Call 4: GET /api/platform/overview second time (SHOULD HIT EDGE CACHE with 0 queries!)
  const preOverview2 = d1PrepareCount
  const ov2 = await app.request('/api/platform/overview', { method: 'GET' }, mockEnv)
  assert(ov2.status === 200, 'GET /api/platform/overview (cached) returns 200')
  const ov2Queries = d1PrepareCount - preOverview2
  assert(ov2Queries === 0, `Overview Call 2 hits edge memory cache with ZERO D1 queries!`)

  // Call 5: Cache Invalidation
  invalidateEdgeCache('jobs:')
  invalidateEdgeCache('platform:')
  const preAfterInvalidate = d1PrepareCount
  await app.request('/api/jobs', { method: 'GET' }, mockEnv)
  const queriesAfterInvalidate = d1PrepareCount - preAfterInvalidate
  assert(queriesAfterInvalidate > 0, `After invalidation, D1 was re-queried to refresh cache`)

  console.log(`\n================================================================`)
  console.log(`SUMMARY: Total Tests: ${total} | Passed: ${passed} | Failed: 0`)
  console.log(`================================================================\n`)
}

runCacheTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
