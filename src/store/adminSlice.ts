import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { User, AdminStats, UserRole } from '../types'
import { adminService } from '../services/api'

interface AdminState {
  users: User[]
  stats: AdminStats | null
  lastFetched: number | null
  isLoading: boolean
  error: string | null
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

export const fetchAdminData = createAsyncThunk(
  'admin/fetchData',
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    const state = (getState() as any).admin as AdminState
    const now = Date.now()
    if (!forceRefresh && state.lastFetched && now - state.lastFetched < CACHE_TTL_MS && state.users.length > 0) {
      return { users: state.users, stats: state.stats, fromCache: true }
    }

    try {
      const [uData, sData] = await Promise.all([
        adminService.getUsers(),
        adminService.getStats(),
      ])
      return {
        users: uData.users || [],
        stats: sData.stats || null,
        fromCache: false,
      }
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch admin data')
    }
  }
)

const initialState: AdminState = {
  users: [],
  stats: null,
  lastFetched: null,
  isLoading: false,
  error: null,
}

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    userRoleUpdated: (state, action: PayloadAction<{ userId: string; newRole: UserRole }>) => {
      // In-memory update: updates user role in directory without re-querying D1
      const user = state.users.find((u) => u.id === action.payload.userId)
      if (user) {
        user.role = action.payload.newRole
      }
    },
    clearAdminCache: (state) => {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminData.pending, (state) => {
        if (state.users.length === 0) {
          state.isLoading = true
        }
      })
      .addCase(fetchAdminData.fulfilled, (state, action) => {
        state.isLoading = false
        state.users = action.payload.users
        state.stats = action.payload.stats
        if (!action.payload.fromCache) {
          state.lastFetched = Date.now()
        }
      })
      .addCase(fetchAdminData.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { userRoleUpdated, clearAdminCache } = adminSlice.actions
export default adminSlice.reducer
