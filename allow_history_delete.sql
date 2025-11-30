-- Allow Admins to delete history items
create policy "Admins can delete history." on history for delete using (
  exists ( select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved' )
);
