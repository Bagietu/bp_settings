-- Fix all foreign key constraints to allow user deletion
-- Run this in Supabase SQL Editor

-- 1. Fix Votes Table (if not already fixed)
alter table public.votes
drop constraint if exists votes_user_id_fkey;

alter table public.votes
add constraint votes_user_id_fkey
foreign key (user_id)
references auth.users(id)
on delete cascade;

-- 2. Fix Profiles Table (Critical for deleting users)
alter table public.profiles
drop constraint if exists profiles_id_fkey;

alter table public.profiles
add constraint profiles_id_fkey
foreign key (id)
references auth.users(id)
on delete cascade;
