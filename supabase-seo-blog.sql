-- SEO + auto-blog upgrade (Nov 2026). Run once in Supabase → SQL Editor.
-- Safe to re-run. The app keeps working before this runs (it falls back to
-- UUID artist URLs and skips run logging), but run it to switch them on.

-- 1. Artist slugs ----------------------------------------------------------
create or replace function public.slugify_text(t text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(t, ''),
      'àáâãäåèéêëìíîïòóôõöùúûüçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇÑ',
      'aaaaaaeeeeiiiiooooouuuucnaaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'))
$$;

alter table public.profiles add column if not exists slug text;
create unique index if not exists profiles_slug_key on public.profiles (slug);

-- Slug = name + discipline + city (e.g. "sampada-photography-firenze").
-- Computed server-side only, so a user can't claim someone else's slug.
-- Locked once category and location are set, so shared links never break;
-- regenerated while the profile is still incomplete.
create or replace function public.profiles_set_slug() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text;
begin
  if NEW.role is distinct from 'artist' then
    if TG_OP = 'UPDATE' then NEW.slug := OLD.slug; end if;
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.slug is not null
     and OLD.category is not null and OLD.location is not null then
    NEW.slug := OLD.slug;
    return NEW;
  end if;
  base := trim(both '-' from left(public.slugify_text(concat_ws(' ', NEW.full_name, NEW.category, NEW.location)), 60));
  if base = '' then base := 'artist'; end if;
  candidate := base;
  if exists (select 1 from public.profiles where slug = candidate and id <> NEW.id) then
    candidate := base || '-' || left(NEW.id::text, 6);
  end if;
  NEW.slug := candidate;
  return NEW;
end $$;

drop trigger if exists profiles_set_slug on public.profiles;
create trigger profiles_set_slug before insert or update on public.profiles
  for each row execute function public.profiles_set_slug();

-- Backfill existing artists (the trigger computes the slug).
update public.profiles set full_name = full_name where role = 'artist';

-- 2. Blog post redirects (for consolidating near-duplicate posts) ----------
alter table public.posts add column if not exists redirect_to text;
-- The blog page reads redirect stubs with the anon key; those rows were public
-- posts before consolidation, so exposing them for the redirect lookup is fine.
drop policy if exists "Public reads redirect stubs" on public.posts;
create policy "Public reads redirect stubs" on public.posts
  for select using (redirect_to is not null);

-- 3. Auto-writer run log: every cron/manual run records its outcome, shown
--    in Admin → Blog, so a broken writer is visible instead of silent.
create table if not exists public.blog_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  type text not null,
  trigger text not null,
  outcome text not null check (outcome in ('generated', 'skipped', 'error')),
  message text,
  post_id uuid references public.posts(id) on delete set null
);
alter table public.blog_runs enable row level security;
drop policy if exists "Admins read blog runs" on public.blog_runs;
create policy "Admins read blog runs" on public.blog_runs
  for select using (public.is_admin());

-- 4. Consolidate the near-duplicate city roundups from July 2026 (e.g. three
--    Bari posts in two weeks). Keeps the newest post per city; the older ones
--    are unpublished and 301-redirect to it (see app/blog/[slug]/page.tsx).
--    To preview, swap the final UPDATE for:
--      select r.slug, k.keep_slug from ranked r join keepers k using (city_key) where r.slug <> k.keep_slug;
with ranked as (
  select id, slug,
    case lower(coalesce(auto_topic, auto_city))
      when 'florence' then 'firenze' when 'rome' then 'roma' when 'milan' then 'milano'
      when 'naples' then 'napoli' when 'venice' then 'venezia' when 'turin' then 'torino'
      else lower(coalesce(auto_topic, auto_city)) end as city_key,
    published_at
  from public.posts
  where is_published and is_auto and category = 'event' and coalesce(auto_topic, auto_city) is not null
),
keepers as (
  select distinct on (city_key) city_key, slug as keep_slug
  from ranked order by city_key, published_at desc
)
update public.posts p
set redirect_to = k.keep_slug, is_published = false
from ranked r join keepers k using (city_key)
where p.id = r.id and r.slug <> k.keep_slug;
