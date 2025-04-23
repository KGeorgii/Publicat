import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://nrszgwteifstwfkzixtm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc3pnd3RlaWZzdHdma3ppeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ2OTU0NTcsImV4cCI6MjAyMDI3MTQ1N30.FBs9PHGec751Kv5GYifHO6z-h8qFAzra1SM7DeJgN4Y');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data: vsesvitData, error } = await supabase
      .from('vsesvit')
      .select('decade, country_latin');

    if (error) {
      res.status(500).json({ error: 'Error fetching data' });
    } else {
      res.status(200).json(vsesvitData);
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
