import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { User } from '../types'
import { candidateService, type CandidateSearchParams } from '../services/api'

interface CandidateCacheEntry {
  candidates: User[]
  totalCount: number
  jdExtractedSkills?: string[]
  correctedQuery?: string
  originalQuery?: string
  timestamp: number
}

interface CandidatesState {
  cacheByQuery: Record<string, CandidateCacheEntry>
  currentResults: User[]
  totalCount: number
  jdExtractedSkills: string[]
  correctedQuery?: string
  originalQuery?: string
  isLoading: boolean
  error: string | null
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes query cache

function getQueryKey(params: CandidateSearchParams): string {
  return [
    params.q || '',
    params.skill || '',
    params.location || '',
    params.category || '',
    (params.jd || '').slice(0, 50),
    params.with_resume ? 'res' : 'all',
  ].join('__').toLowerCase()
}

export const searchCandidatesCached = createAsyncThunk(
  'candidates/search',
  async (
    { params, forceRefresh = false }: { params: CandidateSearchParams; forceRefresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    const key = getQueryKey(params)
    const state = (getState() as any).candidates as CandidatesState
    const cached = state.cacheByQuery[key]
    const now = Date.now()

    // Query Saving: If identical search was run within 5 minutes, return from memory
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return {
        candidates: cached.candidates,
        totalCount: cached.totalCount,
        jdExtractedSkills: cached.jdExtractedSkills || [],
        correctedQuery: cached.correctedQuery,
        originalQuery: cached.originalQuery,
        key,
        fromCache: true,
      }
    }

    try {
      const res = await candidateService.searchCandidates(params)
      return {
        candidates: res.candidates || [],
        totalCount: res.total_count ?? (res.candidates ? res.candidates.length : 0),
        jdExtractedSkills: res.jd_extracted_skills || [],
        correctedQuery: res.corrected_query,
        originalQuery: res.original_query,
        key,
        fromCache: false,
      }
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to search candidates')
    }
  }
)

const initialState: CandidatesState = {
  cacheByQuery: {},
  currentResults: [],
  totalCount: 0,
  jdExtractedSkills: [],
  correctedQuery: undefined,
  originalQuery: undefined,
  isLoading: false,
  error: null,
}

export const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    clearCandidateCache: (state) => {
      state.cacheByQuery = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchCandidatesCached.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(searchCandidatesCached.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentResults = action.payload.candidates
        state.totalCount = action.payload.totalCount
        state.jdExtractedSkills = action.payload.jdExtractedSkills
        state.correctedQuery = action.payload.correctedQuery
        state.originalQuery = action.payload.originalQuery
        if (!action.payload.fromCache) {
          state.cacheByQuery[action.payload.key] = {
            candidates: action.payload.candidates,
            totalCount: action.payload.totalCount,
            jdExtractedSkills: action.payload.jdExtractedSkills,
            correctedQuery: action.payload.correctedQuery,
            originalQuery: action.payload.originalQuery,
            timestamp: Date.now(),
          }
        }
      })
      .addCase(searchCandidatesCached.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCandidateCache } = candidatesSlice.actions
export default candidatesSlice.reducer
