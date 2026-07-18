-- Table des produits
create table products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  description text,
  size text,
  condition text,
  price numeric not null,
  tag text,
  category text not null, -- 'bangers' | 'classiques' | 'kdo'
  image_url text,
  created_at timestamp with time zone default now()
);

-- Lecture publique (le catalogue doit être visible sans connexion)
alter table products enable row level security;

create policy "Public read access"
  on products for select
  using (true);

-- Écriture réservée (on gère l'ajout/suppression via l'API admin avec la clé service_role,
-- jamais depuis le navigateur du visiteur)
create policy "No public write"
  on products for insert
  with check (false);

-- Bucket de stockage pour les photos produit
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true);

create policy "Public read on product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');
