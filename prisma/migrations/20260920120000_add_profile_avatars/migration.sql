ALTER TABLE "users" ADD COLUMN "avatar_path" TEXT;

-- Profile photos stay private. The application creates short-lived signed
-- URLs for authenticated views, while writes remain restricted to the owner.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'avatars',
  'avatars',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authenticated users can read avatar objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
);

CREATE POLICY "Avatar owners can upload their object"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid()::text) || '/avatar'
);

CREATE POLICY "Avatar owners can update their object"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid()::text) || '/avatar'
)
WITH CHECK (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid()::text) || '/avatar'
);

CREATE POLICY "Avatar owners can delete their object"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid()::text) || '/avatar'
);
