async function checkProfiles() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    'https://wnmvgdslcqyshqygrczf.supabase.co',
    'sb_publishable_oYNTN7mr-d_gy-JcfEVGJQ_8IV7ULx7'
  );

  const { data, error } = await supabase
    .from('creators')
    .select('*, users(full_name)')
    .eq('verified', true)
    .limit(3);
  
  if (error) {
    console.error('Error fetching creators:', error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

checkProfiles();
