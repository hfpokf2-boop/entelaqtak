// Example client bootstrap for GitHub Pages.
// Copy this file to supabase-config.js after creating the Supabase project.
// The publishable/anon key is safe to expose only when Row Level Security is enabled.
// Never put a Supabase service-role/secret key or an OpenAI API key in this file.
(() => {
  const config = window.ENTELAQTAK_SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey || !window.supabase?.createClient) {
    window.EntelaqtakBackend = null;
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  window.EntelaqtakBackend = {
    client,
    async signUp(email, password, displayName) {
      return client.auth.signUp({
        email, password,
        options: { data: { display_name: displayName || "" } }
      });
    },
    async signIn(email, password) {
      return client.auth.signInWithPassword({ email, password });
    },
    async signOut() {
      return client.auth.signOut();
    },
    async getSession() {
      return client.auth.getSession();
    },
    async saveWorkspace(data) {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) throw new Error("يلزم تسجيل الدخول.");
      const { error } = await client.from("user_workspaces").upsert({
        user_id: userData.user.id,
        data,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    async loadWorkspace() {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) throw new Error("يلزم تسجيل الدخول.");
      const { data, error } = await client.from("user_workspaces")
        .select("data").eq("user_id", userData.user.id).maybeSingle();
      if (error) throw error;
      return data?.data ?? null;
    },
    async generate(tool, payload) {
      const { data, error } = await client.functions.invoke("ai-assistant", {
        body: { tool, payload }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    }
  };
})();
