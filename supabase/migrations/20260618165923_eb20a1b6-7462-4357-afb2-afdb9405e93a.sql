
CREATE POLICY "Artists can upload own artist photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] = 'artist-photos'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Artists can upload own artist cover"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] = 'artist-covers'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Artists can update own artist files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] IN ('artist-photos','artist-covers')
  AND (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] IN ('artist-photos','artist-covers')
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Artists can delete own artist files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] IN ('artist-photos','artist-covers')
  AND (storage.foldername(name))[2] = (auth.uid())::text
);
