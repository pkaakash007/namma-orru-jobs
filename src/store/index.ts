import { configureStore } from '@reduxjs/toolkit'
import jobsReducer from './jobsSlice'
import postsReducer from './postsSlice'
import candidatesReducer from './candidatesSlice'
import adminReducer from './adminSlice'

const STORAGE_KEY = 'namma_redux_cache_v1'

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    return {
      jobs: parsed.jobs || undefined,
      posts: parsed.posts || undefined,
      admin: parsed.admin || undefined,
    }
  } catch {
    return undefined
  }
}

export const store = configureStore({
  reducer: {
    jobs: jobsReducer,
    posts: postsReducer,
    candidates: candidatesReducer,
    admin: adminReducer,
  },
  preloadedState: loadPersistedState(),
})

// Debounced persistence to localStorage for instant offline access and 0 D1 reads across sessions
let saveTimeout: any = null
store.subscribe(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      const state = store.getState()
      const toSave = {
        jobs: {
          items: state.jobs.items.slice(0, 50),
          totalCount: state.jobs.totalCount,
          registeredOnly: state.jobs.registeredOnly,
          lastFetched: state.jobs.lastFetched,
          isLoading: false,
          error: null,
        },
        posts: {
          items: state.posts.items.slice(0, 30),
          lastFetched: state.posts.lastFetched,
          isLoading: false,
          error: null,
        },
        admin: {
          users: state.admin.users,
          stats: state.admin.stats,
          lastFetched: state.admin.lastFetched,
          isLoading: false,
          error: null,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {}
  }, 1000)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
