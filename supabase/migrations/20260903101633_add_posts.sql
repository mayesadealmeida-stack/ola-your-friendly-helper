-- Feed da Home: publicações/novidades (conteúdo oficial, não gerado pelo utilizador).
-- Leitura pública para quem tem sessão; escrita reservada ao backend/administração (service_role).

CREATE TABLE public.posts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL DEFAULT 'Group Mobil',
  author_avatar_url TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read posts" ON public.posts FOR SELECT TO authenticated USING (true);
