-- Final fix for user trigger to ensure correct default role and status
-- Run this in Supabase SQL Editor

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'user',      -- Default role is now 'user'
    'approved'   -- Default status is now 'approved' to allow immediate login
  );
  return new;
end;
$$;

-- Ensure the trigger exists (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
