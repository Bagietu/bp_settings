import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieiptwnbnekjfnamizqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaXB0d25ibmVramZuYW1penFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTY3MTksImV4cCI6MjA3OTU5MjcxOX0.Uy9gAykm1VONYmR2GiU17UjY6DqlSfJ9GseA1JLRrdw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
