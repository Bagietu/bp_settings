-- 1. Enable the UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- 2. Re-create the history table if it failed to create previously
create table if not exists history (
  id uuid default uuid_generate_v4() primary key,
  user_email text,
  action text, -- 'create', 'update', 'delete'
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Ensure RLS is enabled
alter table history enable row level security;

-- 4. Re-apply policies (drop first to avoid errors if they exist)
drop policy if exists "Admins can view history." on history;
create policy "Admins can view history." on history for select using (
  exists ( select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved' )
);

drop policy if exists "Authenticated users can insert history." on history;
create policy "Authenticated users can insert history." on history for insert with check ( auth.role() = 'authenticated' );
