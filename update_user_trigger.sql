-- Update the function to default to 'user' instead of 'moderator'
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
    'user', -- Changed from 'moderator' to 'user'
    'approved' -- Auto-approve standard users so they can vote immediately
  );
  return new;
end;
$$;
