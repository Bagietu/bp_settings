-- Create profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'moderator', -- 'admin' or 'moderator'
  status text default 'pending', -- 'approved' or 'pending'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Admins can update profiles." on profiles for update using ( 
  exists ( select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved' )
);

-- Create history table
create table history (
  id uuid default uuid_generate_v4() primary key,
  user_email text,
  action text, -- 'create', 'update', 'delete'
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table history enable row level security;

-- Create policies for history
create policy "Admins can view history." on history for select using (
  exists ( select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved' )
);
create policy "Authenticated users can insert history." on history for insert with check ( auth.role() = 'authenticated' );
