-- Create Votes Table
create table if not exists public.votes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    setting_id uuid references public.settings(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.votes enable row level security;

-- Policies for Votes
create policy "Users can view all votes"
    on public.votes for select
    using (true);

create policy "Authenticated users can insert votes"
    on public.votes for insert
    with check (auth.uid() = user_id);

-- Create App Config Table
create table if not exists public.app_config (
    key text primary key,
    value text not null
);

-- Insert default vote period (7 days)
insert into public.app_config (key, value)
values ('vote_period_days', '7')
on conflict (key) do nothing;

-- Enable RLS for App Config
alter table public.app_config enable row level security;

create policy "Everyone can view config"
    on public.app_config for select
    using (true);

create policy "Only admins can update config"
    on public.app_config for update
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() and profiles.role = 'admin'
        )
    );
