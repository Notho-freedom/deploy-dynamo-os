import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { vercel, VercelDeployment } from '@/lib/vercel';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { Plus, Rocket, Github, ExternalLink, GitBranch, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserProject {
  id: string;
  vercel_project_id: string;
  vercel_project_name: string;
  github_repo_full_name: string;
  branch: string;
  framework: string | null;
  production_url: string | null;
  created_at: string;
}

const STATE_COLOR: Record<string, string> = {
  READY: 'text-success border-success/40 bg-success/10',
  BUILDING: 'text-primary border-primary/40 bg-primary/10',
  QUEUED: 'text-muted-foreground border-border bg-muted/30',
  INITIALIZING: 'text-primary border-primary/40 bg-primary/10',
  ERROR: 'text-destructive border-destructive/40 bg-destructive/10',
  CANCELED: 'text-muted-foreground border-border bg-muted/30',
};

export default function Deploy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [latest, setLatest] = useState<Record<string, VercelDeployment | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as UserProject[];
        setProjects(list);
        setLoading(false);
        // Fetch latest deployment per project (in parallel, fire and forget)
        list.forEach(async (p) => {
          const r = await vercel.listDeployments(p.vercel_project_id).catch(() => ({ deployments: [] as VercelDeployment[] }));
          setLatest((prev) => ({ ...prev, [p.vercel_project_id]: r.deployments?.[0] || null }));
        });
      });
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Deployment</p>
          <h1 className="font-editorial text-4xl tracking-tight">
            Your <em className="italic text-muted-foreground">projects</em>
          </h1>
        </div>
        <Button onClick={() => navigate('/dashboard/deploy/new')} className="gap-2">
          <Plus className="h-3.5 w-3.5" /> New Project
        </Button>
      </div>

      {loading ? (
        <div className="border border-border rounded-md p-12 text-center text-[13px] text-muted-foreground inline-flex items-center gap-2 justify-center w-full">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-border rounded-md">
          <EmptyState
            icon={<Rocket className="h-10 w-10" />}
            title="No projects yet"
            description="Import a GitHub repository to ship your first deployment."
            action={
              <Button onClick={() => navigate('/dashboard/deploy/new')} className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Import a repository
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const d = latest[p.vercel_project_id];
            return (
              <Link
                key={p.id}
                to={`/dashboard/deploy/${p.vercel_project_id}`}
                className="border border-border rounded-md p-5 hover:border-foreground/40 transition group flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-editorial text-lg truncate">{p.vercel_project_name}</h3>
                    <p className="text-[11px] font-mono text-muted-foreground truncate inline-flex items-center gap-1">
                      <Github className="h-3 w-3" /> {p.github_repo_full_name}
                    </p>
                  </div>
                  {d && (
                    <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-mono uppercase rounded border ${STATE_COLOR[d.state] || ''}`}>
                      {d.state}
                    </span>
                  )}
                </div>

                {d?.url && (
                  <a
                    href={`https://${d.url}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[12px] font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate"
                  >
                    {d.url} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}

                <div className="flex items-center justify-between text-[10.5px] font-mono text-muted-foreground mt-auto pt-2 border-t border-border">
                  <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" /> {p.branch}</span>
                  <span>{p.framework || 'static'}</span>
                  <span>{formatDistanceToNow(new Date(d?.created || p.created_at), { addSuffix: true })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
