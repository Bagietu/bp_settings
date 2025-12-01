-- 1. Fix User Deletion (Add ON DELETE CASCADE to votes)
alter table public.votes
drop constraint if exists votes_user_id_fkey;

alter table public.votes
add constraint votes_user_id_fkey
foreign key (user_id)
references auth.users(id)
on delete cascade;

-- 2. Revert Auto-Approval (Keep 'user' role, but set status to 'pending')
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
    'user',      -- Default role remains 'user'
    'pending'    -- Reverted to 'pending' so admin approval is required
  );
  return new;
end;
$$;
