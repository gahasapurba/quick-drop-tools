-- ==============================================================================
-- QUICK DROP / CLIPBOARD SYNC - SUPABASE SETUP SCRIPT
-- Jalankan query ini di SQL Editor dashboard Supabase kamu.
-- ==============================================================================

-- 1. Buat tabel items untuk teks, gambar, dan file
CREATE TABLE IF NOT EXISTS public.drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'image', 'file')),
    content TEXT, -- Teks atau caption
    file_url TEXT, -- URL file/gambar jika ada
    file_name TEXT, -- Nama asli file
    file_size BIGINT -- Ukuran file dalam bytes
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

-- Buat policy publik (Bisa dibatasi dengan PIN di level aplikasi)
CREATE POLICY "Allow public read drops"
ON public.drops FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert drops"
ON public.drops FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public delete drops"
ON public.drops FOR DELETE
TO anon, authenticated
USING (true);

-- 3. Aktifkan Realtime untuk tabel drops
ALTER PUBLICATION supabase_realtime ADD TABLE public.drops;

-- 4. Setup Storage Bucket untuk File & Gambar
-- Bucket 'drop-files' dengan akses publik
INSERT INTO storage.buckets (id, name, public) 
VALUES ('drop-files', 'drop-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Read drop-files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'drop-files');

CREATE POLICY "Public Upload drop-files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'drop-files');

CREATE POLICY "Public Delete drop-files"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'drop-files');
