ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN sort_order BIGSERIAL NOT NULL;
CREATE INDEX tasks_order_idx ON tasks(user_id, sort_order);
