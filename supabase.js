import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nrszgwteifstwfkzixtm.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc3pnd3RlaWZzdHdma3ppeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ2OTU0NTcsImV4cCI6MjAyMDI3MTQ1N30.FBs9PHGec751Kv5GYifHO6z-h8qFAzra1SM7DeJgN4Y'; // Replace with your Supabase Service Key

export const supabase = createClient(supabaseUrl, supabaseKey);
