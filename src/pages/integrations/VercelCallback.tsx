import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Triangle } from 'lucide-react';
import { vercelOAuthExchange } from '@/lib/vercel';
import { toast } from 'sonner';

export default function VercelCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get('code');
    const error = params.get('error');
    if (error) {
      toast.error(`Vercel: ${error}`);
      navigate('/dashboard/cicd');
      return;
    }
    if (!code) { navigate('/dashboard/cicd'); return; }
    vercelOAuthExchange(code)
      .then((res) => {
        toast.success(`Vercel connected${res.username ? ` as ${res.username}` : ''}`);
        navigate('/dashboard/cicd?connected=vercel');
      })
      .catch((e) => {
        toast.error(e.message || 'Vercel connection failed');
        navigate('/dashboard/cicd');
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Triangle className="h-8 w-8 fill-current" />
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground font-mono">Finalizing Vercel install…</p>
    </div>
  );
}
