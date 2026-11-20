-- Enable per-user workspace updates over Supabase Realtime.
-- Row-level security still restricts each subscriber to their own workspace row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_workspaces'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_workspaces;
  END IF;
END
$$;
