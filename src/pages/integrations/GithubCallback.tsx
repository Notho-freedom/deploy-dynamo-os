import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Github, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function GithubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const expected = sessionStorage.getItem('gh_oauth_state');
    sessionStorage.removeItem('gh_oauth_state');
    if (error) { toast.error(`GitHub: ${error}`); navigate('/dashboard/cicd'); return; }
    if (!code) { navigate('/dashboard/cicd'); return; }
    if (expected && state && expected !== state) { toast.error('OAuth state mismatch'); navigate('/dashboard/cicd'); return; }

    (async () => {
      const { data, error: e } = await supabase.functions.invoke('github-oauth-callback', {
        body: { code, redirect_uri: `${window.location.origin}/integrations/github/callback` },
      });
      if (e || data?.error) {
        toast.error(data?.error || e?.message || 'GitHub connection failed');
        navigate('/dashboard/cicd');
      } else {
        toast.success(`GitHub connected as ${data.login}`);
        navigate('/dashboard/cicd?connected=github');
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Github className="h-8 w-8" />
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground font-mono">Finalizing GitHub authorization…</p>
    </div>
  );
}
