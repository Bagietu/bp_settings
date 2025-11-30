-- Add last_updated column to settings table
alter table settings 
add column last_updated timestamp with time zone default timezone('utc'::text, now());

-- Optional: If you want to backfill existing rows with a timestamp
update settings 
set last_updated = created_at 
where last_updated is null;
