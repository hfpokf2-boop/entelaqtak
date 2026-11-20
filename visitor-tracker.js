/* Entelaqtak visitor analytics. Anonymous visitors are represented by a random session ID. */
(() => {
  const cfg = window.ENTELAQTAK_CONFIG;
  if (!cfg?.url || !cfg?.publishableKey || !window.supabase?.createClient) return;
  const start = () => {
    if (window.__entelaqtakVisitorTrackerStarted) return;
    window.__entelaqtakVisitorTrackerStarted = true;
    const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const KEY = 'entelaqtak-visitor-session-v1';
    let sessionId;
    try {
      sessionId = localStorage.getItem(KEY);
      if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(KEY, sessionId);
      }
    } catch (_) { sessionId = crypto.randomUUID(); }
    let closed = false;
    const page = () => (location.pathname + location.search).slice(0, 500);
    async function heartbeat(ended = false) {
      if (closed && !ended) return;
      try {
        const { data: authData } = await client.auth.getUser();
        const user = authData?.user || null;
        const payload = {
          session_id: sessionId,
          user_id: user?.id || null,
          visitor_email: user?.email || null,
          page_path: page(),
          last_seen: new Date().toISOString(),
          ended_at: ended ? new Date().toISOString() : null,
          user_agent: (navigator.userAgent || '').slice(0, 500),
          referrer: (document.referrer || '').slice(0, 1000)
        };
        const { data: existing } = await client.from('visitor_sessions')
          .select('session_id').eq('session_id', sessionId).maybeSingle();
        if (existing) {
          await client.from('visitor_sessions').update(payload).eq('session_id', sessionId);
        } else {
          await client.from('visitor_sessions').insert({ ...payload, first_seen: new Date().toISOString() });
        }
      } catch (_) { /* Analytics must never interrupt the workspace. */ }
    }
    heartbeat();
    const timer = setInterval(() => heartbeat(), 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') heartbeat();
      else heartbeat(true);
    });
    window.addEventListener('pagehide', () => {
      closed = true;
      clearInterval(timer);
      heartbeat(true);
    }, { once: true });
  };
  if (window.supabase?.createClient) start();
  else {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = start;
    script.async = true;
    document.head.appendChild(script);
  }
})();
