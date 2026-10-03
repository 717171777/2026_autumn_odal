CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  name VARCHAR(50) NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_credentials CHECK (is_guest OR (email IS NOT NULL AND password_hash IS NOT NULL))
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  color TEXT NOT NULL DEFAULT 'orange',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id)
);
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID,
  title VARCHAR(300) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  due_date DATE,
  priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (project_id, user_id) REFERENCES projects(id, user_id),
  UNIQUE (recurrence_parent_id)
);
CREATE INDEX tasks_user_idx ON tasks(user_id, created_at DESC);
CREATE INDEX tasks_due_idx ON tasks(user_id, due_date) WHERE completed_at IS NULL AND deleted_at IS NULL;
CREATE TABLE auth_rate_limits (
  key_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);
