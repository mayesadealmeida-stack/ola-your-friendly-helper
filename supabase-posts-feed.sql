-- =============================================================================
-- GROUP MOBIL — Feed de publicações (novidades, eventos, notícias)
-- Cole este script no SQL Editor do Supabase e execute uma vez.
-- =============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null default 'Group Mobil',
  author_avatar_url text,
  title text not null,
  body text,
  image_url text,
  category text not null default 'novidade' check (category in ('novidade', 'evento', 'noticia')),
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.posts is
  'Feed de publicações mostrado na Home. Por agora só a própria plataforma publica (conta oficial "Group Mobil") — não há criação de posts pelos utilizadores.';

alter table public.posts enable row level security;

-- Qualquer pessoa pode ver o feed. Ninguém escreve diretamente a partir do
-- site — só através da service role (ex.: um painel de administração ou
-- uma Edge Function futura), o que impede spam e publicações falsas.
create policy "Qualquer pessoa pode ver as publicações" on public.posts
  for select using (true);

-- 2) ALGUMAS PUBLICAÇÕES OFICIAIS DE EXEMPLO --------------------------------

insert into public.posts
  (author_name, author_avatar_url, title, body, category, likes_count, comments_count, shares_count, created_at)
values
  (
    'Group Mobil',
    '/logo-group-mobil-mark.webp',
    'Bem-vindo à Group Mobil 👋',
    'A sua kixikila digital chegou. Crie o seu grupo, convide quem confia e acompanhe cada contribuição e cada turno, tudo a partir do telemóvel.',
    'novidade',
    24, 3, 5,
    now() - interval '6 days'
  ),
  (
    'Group Mobil',
    '/logo-group-mobil-mark.webp',
    'Novo: Sistema de Níveis 🟢🔵🟣🟠🟡',
    'Cada participante tem agora uma Taxa de Cumprimento e um nível — Iniciante, Regular, Confiável, Avançado ou Excelente — calculados automaticamente a partir do seu histórico real. Veja o seu no separador Perfil.',
    'novidade',
    41, 7, 12,
    now() - interval '4 days'
  ),
  (
    'Group Mobil',
    '/logo-group-mobil-mark.webp',
    'Segurança da sua conta 🔐',
    'Nunca partilhe o seu PIN ou código de verificação com ninguém, nem mesmo com alguém que diga ser da equipa Group Mobil. A nossa equipa nunca pede essa informação.',
    'noticia',
    33, 2, 9,
    now() - interval '2 days'
  ),
  (
    'Group Mobil',
    '/logo-group-mobil-mark.webp',
    'Verifique a sua conta com o KYC Basic',
    'Complete a verificação básica de identidade para desbloquear todas as funcionalidades da plataforma, incluindo criar os seus próprios grupos.',
    'noticia',
    18, 1, 4,
    now() - interval '1 day'
  ),
  (
    'Group Mobil',
    '/logo-group-mobil-mark.webp',
    'Dica: como escolher bem o seu grupo',
    'Antes de entrar numa kixikila, confira o histórico de cumprimento dos outros membros no perfil deles. O nível ajuda, mas a decisão final é sempre sua.',
    'novidade',
    27, 5, 6,
    now() - interval '10 hours'
  );

-- =============================================================================
-- Fim do script. Para publicar mais novidades no futuro, basta correr um
-- INSERT igual aos de cima no SQL Editor — não precisa de mexer no código.
-- =============================================================================
