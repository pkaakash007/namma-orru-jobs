import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Post } from '../types'
import { feedService } from '../services/api'

interface PostsState {
  items: Post[]
  lastFetched: number | null
  isLoading: boolean
  error: string | null
}

const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes cache TTL

export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    const state = (getState() as any).posts as PostsState
    const now = Date.now()
    if (!forceRefresh && state.lastFetched && now - state.lastFetched < CACHE_TTL_MS && state.items.length > 0) {
      // One-Time Fetch: Return memory cache without hitting Cloudflare D1
      return { posts: state.items, fromCache: true }
    }

    try {
      const data = await feedService.getPosts()
      return { posts: data.posts || [], fromCache: false }
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch posts')
    }
  },
  {
    condition: (forceRefresh, { getState }) => {
      const state = (getState() as any).posts as PostsState
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

const initialState: PostsState = {
  items: [],
  lastFetched: null,
  isLoading: false,
  error: null,
}

export const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    postAdded: (state, action: PayloadAction<Post>) => {
      // Optimistic insert: Avoids refetching all posts from D1
      state.items.unshift(action.payload)
    },
    postLiked: (state, action: PayloadAction<{ id: string; likes_count: number; liked?: boolean }>) => {
      // Optimistic reaction update
      const post = state.items.find((p) => p.id === action.payload.id)
      if (post) {
        post.likes_count = action.payload.likes_count
        if (action.payload.liked !== undefined) {
          post.is_liked = action.payload.liked
          post.liked_by_me = action.payload.liked
        } else {
          post.is_liked = !post.is_liked
          post.liked_by_me = post.is_liked
        }
      }
    },
    clearPostsCache: (state) => {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        if (state.items.length === 0) {
          state.isLoading = true
        }
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload.posts
        if (!action.payload.fromCache) {
          state.lastFetched = Date.now()
        }
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { postAdded, postLiked, clearPostsCache } = postsSlice.actions
export default postsSlice.reducer
