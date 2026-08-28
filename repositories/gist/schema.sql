-- Blog content schema (Ghost-5-inspired posts domain).
-- Applied with a DIRECT (non-pooled) connection while the app reads via
-- the pooled DATABASE_URL. Schema-as-code: this file is the source of truth.
-- NOTE: applied by splitting on ";" after stripping "--" comments — keep
-- statements free of embedded semicolons (no function bodies).

create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email text,
  bio text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists posts (
  -- text PK: existing rows keep their legacy gist ids, so editor URLs and
  -- any external references survive the migration.
  id text primary key,
  title text not null,
  slug text not null,
  -- MDX source (Ghost stores lexical; this blog's format is MDX).
  content text not null default '',
  custom_excerpt text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'scheduled')),
  visibility text not null default 'public'
    check (visibility in ('public', 'members', 'paid')),
  featured boolean not null default false,
  post_type text not null default 'post'
    check (post_type in ('post', 'page')),
  -- Per-post content language (the Sharing type's language tag).
  language text,
  -- Denormalized from the content's cover marker (alt|WxH|cover) at write
  -- time, like reading_time_minutes — list surfaces never parse content.
  feature_image text,
  feature_image_alt text,
  feature_image_width int,
  feature_image_height int,
  reading_time_minutes int,
  -- Ghost's per-post SEO overrides.
  meta_title text,
  meta_description text,
  og_image text,
  og_title text,
  og_description text,
  twitter_image text,
  twitter_title text,
  twitter_description text,
  canonical_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, post_type)
);

create index if not exists posts_status_published_at_idx
  on posts (status, published_at desc);
create index if not exists posts_featured_idx
  on posts (featured) where featured;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  visibility text not null default 'public'
    check (visibility in ('public', 'internal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- First tag by sort_order = the post's primary tag (Ghost semantics; this
-- blog's "type" is the primary tag).
create table if not exists posts_tags (
  post_id text not null references posts (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  sort_order int not null default 0,
  primary key (post_id, tag_id)
);
create index if not exists posts_tags_tag_idx on posts_tags (tag_id);

create table if not exists posts_authors (
  post_id text not null references posts (id) on delete cascade,
  author_id uuid not null references authors (id) on delete cascade,
  sort_order int not null default 0,
  primary key (post_id, author_id)
);

-- Content snapshots on every update — replaces gist revision history.
create table if not exists post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references posts (id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_revisions_post_idx
  on post_revisions (post_id, created_at desc);

-- Site-wide editable copy (Ghost-style settings): key/value rows edited
-- from the editor's Customize page. Known keys: site_description,
-- footer_note. Per-tag copy lives on tags.description.
create table if not exists settings (
  key text primary key,
  value text,
  group_name text not null default 'site',
  updated_at timestamptz not null default now()
);
