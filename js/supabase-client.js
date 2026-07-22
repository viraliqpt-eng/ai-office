let aiOfficeSupabase = null;

function aiOfficeSupabaseConfigured() {
  const cfg = window.AI_OFFICE_CONFIG || {};
  return cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("COLOQUE_AQUI") &&
    !cfg.SUPABASE_ANON_KEY.includes("COLOQUE_AQUI");
}

if (aiOfficeSupabaseConfigured() && window.supabase) {
  aiOfficeSupabase = window.supabase.createClient(
    window.AI_OFFICE_CONFIG.SUPABASE_URL,
    window.AI_OFFICE_CONFIG.SUPABASE_ANON_KEY
  );
}
