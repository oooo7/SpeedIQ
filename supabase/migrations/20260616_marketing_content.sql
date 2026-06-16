-- Create blog_posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  cover_image text,
  author_name text not null default 'SpeedIQ Team',
  author_avatar text,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.blog_posts enable row level security;

-- Policies
create policy "Allow anonymous select for published blog posts"
  on public.blog_posts for select
  using (published = true);

create policy "Allow service role full access to blog posts"
  on public.blog_posts for all
  using (true);

-- Create trigger for updated_at
drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.update_updated_at();


-- Create changelog_entries table
create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null,
  version text,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.changelog_entries enable row level security;

-- Policies
create policy "Allow anonymous select for published changelog entries"
  on public.changelog_entries for select
  using (published = true);

create policy "Allow service role full access to changelog entries"
  on public.changelog_entries for all
  using (true);

-- Create trigger for updated_at
drop trigger if exists changelog_entries_updated_at on public.changelog_entries;
create trigger changelog_entries_updated_at
  before update on public.changelog_entries
  for each row execute function public.update_updated_at();


-- Create customer_stories table
create table if not exists public.customer_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  company_name text not null,
  industry text,
  challenge text,
  solution text,
  result text,
  testimonial_quote text,
  testimonial_author text,
  testimonial_role text,
  logo_url text,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.customer_stories enable row level security;

-- Policies
create policy "Allow anonymous select for published customer stories"
  on public.customer_stories for select
  using (published = true);

create policy "Allow service role full access to customer stories"
  on public.customer_stories for all
  using (true);

-- Create trigger for updated_at
drop trigger if exists customer_stories_updated_at on public.customer_stories;
create trigger customer_stories_updated_at
  before update on public.customer_stories
  for each row execute function public.update_updated_at();


-- Create contact_submissions table
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  message text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.contact_submissions enable row level security;

-- Policies
create policy "Allow anonymous insert for contact submissions"
  on public.contact_submissions for insert
  with check (true);

create policy "Allow service role full access to contact submissions"
  on public.contact_submissions for all
  using (true);
