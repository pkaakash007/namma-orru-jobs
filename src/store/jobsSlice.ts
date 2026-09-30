import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Job } from '../types'
import { jobsService } from '../services/api'

interface JobsState {
  items: Job[]
  totalCount: number
  registeredOnly: boolean
  lastFetched: number | null
  isLoading: boolean
  error: string | null
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache TTL

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    const state = (getState() as any).jobs as JobsState
    const now = Date.now()
    if (!forceRefresh && state.lastFetched && now - state.lastFetched < CACHE_TTL_MS && state.items.length > 0) {
      // One-Time Fetch: Return existing memory cache to save Cloudflare D1 queries
      return {
        jobs: state.items,
        total_count: state.totalCount,
        registered_only: state.registeredOnly,
        fromCache: true,
      }
    }

    try {
      const data = await jobsService.getJobs()
      return {
        jobs: data.jobs || [],
        total_count: data.total_count ?? (data.jobs ? data.jobs.length : 0),
        registered_only: data.registered_only || false,
        fromCache: false,
      }
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch jobs')
    }
  },
  {
    condition: (forceRefresh, { getState }) => {
      const state = (getState() as any).jobs as JobsState
      // Prevent duplicate in-flight requests
      if (state.isLoading) {
        return false
      }
      const now = Date.now()
      // Skip if fresh cache exists and not a force-refresh
      if (!forceRefresh && state.lastFetched && now - state.lastFetched < CACHE_TTL_MS && state.items.length > 0) {
        return false
      }
      return true
    },
  }
)

const initialState: JobsState = {
  items: [],
  totalCount: 0,
  registeredOnly: false,
  lastFetched: null,
  isLoading: false,
  error: null,
}

export const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    jobAdded: (state, action: PayloadAction<Job>) => {
      // Optimistic insert: avoids re-querying all 50 jobs from Cloudflare D1
      state.items.unshift(action.payload)
      state.totalCount += 1
    },
    jobDeleted: (state, action: PayloadAction<string>) => {
      // Optimistic delete: avoids re-querying Cloudflare D1
      state.items = state.items.filter((j) => j.id !== action.payload)
      state.totalCount = Math.max(0, state.totalCount - 1)
    },
    jobApplied: (state, action: PayloadAction<string>) => {
      // Optimistic applicant count increment
      const job = state.items.find((j) => j.id === action.payload)
      if (job) {
        job.applicants_count = (job.applicants_count || 0) + 1
      }
    },
    clearJobsCache: (state) => {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        if (state.items.length === 0) {
          state.isLoading = true
        }
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload.jobs
        state.totalCount = action.payload.total_count
        state.registeredOnly = action.payload.registered_only
        if (!action.payload.fromCache) {
          state.lastFetched = Date.now()
        }
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { jobAdded, jobDeleted, jobApplied, clearJobsCache } = jobsSlice.actions
export default jobsSlice.reducer
