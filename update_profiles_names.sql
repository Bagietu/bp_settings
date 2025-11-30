-- 1. Add name columns to profiles table
alter table profiles 
add column first_name text,
add column last_name text;

-- 2. Update your specific user to be an Admin and Approved
-- REPLACE 'YOUR_EMAIL@EXAMPLE.COM' WITH YOUR ACTUAL EMAIL ADDRESS
update profiles 
set role = 'admin', status = 'approved' 
where email = 'YOUR_EMAIL@EXAMPLE.COM';
