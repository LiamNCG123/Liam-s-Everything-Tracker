-- Run this AFTER creating the "avatars" bucket in the Supabase dashboard
-- (Storage → New bucket → name: "avatars", toggle Public on)

-- Anyone can view avatars (public bucket, but belt-and-suspenders)
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can only upload into their own folder  (<user-id>/avatar.<ext>)
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can replace (upsert) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
