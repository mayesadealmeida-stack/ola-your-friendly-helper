-- Categoria da publicação, para as abas do feed da Home (Novidades / Eventos / Notícias).

ALTER TABLE public.posts ADD COLUMN category TEXT NOT NULL DEFAULT 'novidade'
  CHECK (category IN ('novidade', 'evento', 'noticia'));
