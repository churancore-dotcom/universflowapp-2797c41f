CREATE POLICY "artist-kyc owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'artist-kyc'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'artist-kyc'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);