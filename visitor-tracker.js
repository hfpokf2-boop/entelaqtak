/* Entelaqtak visitor analytics: pseudonymous sessions with a per-browser secret. */
(() => {
  const cfg = window.ENTELAQTAK_CONFIG;
  if (!cfg?.url || !cfg?.publishableKey) return;

  const start = () => {
    if (window.__entelaqtakVisitorTrackerStarted || !window.supabase?.createClient) return;
    window.__entelaqtakVisitorTrackerStarted = true;

    const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const ID_KEY = 'entelaqtak-visitor-session-v2';
    const TOKEN_KEY = 'entelaqtak-visitor-secret-v2';
    const randomHex = (bytes) => {
      const data = new Uint8Array(bytes);
      crypto.getRandomValues(data);
      return Array.from(data, b => b.toString(16).padStart(2, '0')).join('');
    };

    let sessionId, sessionToken;
    try {
      sessionId = localStorage.getItem(ID_KEY);
      sessionToken = localStorage.getItem(TOKEN_KEY);
      if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId) || !sessionToken || !/^[0-9a-f]{64}$/i.test(sessionToken)) {
        sessionId = crypto.randomUUID();
        sessionToken = randomHex(32);
        localStorage.setItem(ID_KEY, sessionId);
        localStorage.setItem(TOKEN_KEY, sessionToken);
      }
    } catch (_) {
      sessionId = crypto.randomUUID();
      sessionToken = randomHex(32);
    }

    let closed = false;
    let inFlight = false;
    const page = () => (location.pathname + location.search).slice(0, 500);

    async function heartbeat(ended = false) {
      if ((closed && !ended) || inFlight) return;
      inFlight = true;
      try {
        const { data: authData } = await client.auth.getSession();
        const user = authData?.session?.user || null;
        const { error } = await client.rpc('heartbeat_visitor_session', {
          p_session_id: sessionId,
          p_session_token: sessionToken,
          p_user_id: user?.id || null,
          p_visitor_email: user?.email || null,
          p_page_path: page(),
          p_user_agent: (navigator.userAgent || '').slice(0, 500),
          p_referrer: (document.referrer || '').slice(0, 1000),
          p_ended: Boolean(ended)
        });
        if (error) throw error;
      } catch (_) {
        // Analytics failures must never interrupt the workspace.
      } finally {
        inFlight = false;
      }
    }

    heartbeat();
    const timer = setInterval(() => heartbeat(), 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') heartbeat();
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