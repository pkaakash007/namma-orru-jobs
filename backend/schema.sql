-- Cloudflare D1 Database Schema for LinkedIn-like Professional Network

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  password_hash TEXT DEFAULT '',
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'manager', 'employee')) DEFAULT 'employee' NOT NULL,
  assigned_by TEXT, -- Admin ID who assigned the manager role
  status TEXT DEFAULT 'active',
  headline TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  company TEXT DEFAULT '',
  position TEXT DEFAULT '',
  skills TEXT DEFAULT '[]', -- JSON array of strings
  username TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  deactivated_until DATETIME DEFAULT NULL,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  connections_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- 2. Connections Table (Professional Network)
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(requester_id, receiver_id)
);

-- 3. Posts Table (Feed)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT DEFAULT '[]', -- JSON array of media links
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Post Likes Table
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

-- 5. Post Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Jobs Board Table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  poster_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo TEXT DEFAULT '',
  location TEXT NOT NULL,
  workplace_type TEXT CHECK(workplace_type IN ('Remote', 'Hybrid', 'On-site')) DEFAULT 'Remote',
  employment_type TEXT CHECK(employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship')) DEFAULT 'Full-time',
  description TEXT NOT NULL,
  salary_range TEXT DEFAULT '',
  applicants_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poster_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Direct Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  applicant_user_id TEXT,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_phone TEXT DEFAULT '',
  resume_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. User Follows Table
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, following_id)
);

-- 10. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Conversation Participants Table
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Chat Messages Table (Moderated 1-to-1)
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME DEFAULT NULL,
  moderation_status TEXT CHECK(moderation_status IN ('APPROVED', 'REJECTED', 'PENDING')) DEFAULT 'APPROVED',
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. User Policy Violations Audit Table
CREATE TABLE IF NOT EXISTS user_violations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  violation_type TEXT NOT NULL, -- 'BAD_WORD', 'HARASSMENT', 'SEXUAL_TEXT', 'NUDITY_IMAGE', 'EXPLICIT_IMAGE', 'VIOLENT_IMAGE', 'OTHER'
  content_type TEXT NOT NULL,   -- 'MESSAGE', 'PROFILE', 'IMAGE', 'POST', 'COMMENT'
  severity TEXT DEFAULT 'HIGH', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deactivated_until DATETIME,
  metadata TEXT DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(requester_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_user ON job_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_email ON job_applications(candidate_email);

-- Social & Moderation Indexes
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_violations_user ON user_violations(user_id, created_at DESC);

-- 14. User Saved Jobs Table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE(user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job ON saved_jobs(job_id);

-- 15. WhatsApp / Mobile OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
  phone TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  full_name TEXT,
  expires_at INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
