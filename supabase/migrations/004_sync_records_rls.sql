-- Add RLS policies to sync_records so authenticated users can read/write their own rows.
-- The user_id column is text; Supabase auth UIDs are cast to match.

CREATE POLICY "Users can read own records"
  ON public.sync_records FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own records"
  ON public.sync_records FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own records"
  ON public.sync_records FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own records"
  ON public.sync_records FOR DELETE
  USING (auth.uid()::text = user_id);
