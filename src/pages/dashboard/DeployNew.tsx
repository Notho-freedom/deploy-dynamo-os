import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntegration } from '@/hooks/useIntegration';
import { github, GhRepo, GhOrg, startGithubOAuth } from '@/lib/github';
import { Button } from '@/components/ui/button';
import { Github, Search, Lock, Loader2, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function DeployNew() {
  const navigate = useNavigate();
  const gh = useIntegration('github');
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [orgs, setOrgs] = useState<GhOrg[]>([]);
  const [owner, setOwner] = useState<string>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gh.connected) return;
    setLoading(true);
    Promise.all([github.myRepos(), github.myOrgs().catch(() => [])])
      .then(([r, o]) => { setRepos(r); setOrgs(o); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [gh.connected]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    repos.forEach((r) => set.add(r.owner.login));
    orgs.forEach((o) => set.add(o.login));
    return Array.from(set);
  }, [repos, orgs]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return repos
      .filter((r) => owner === 'all' || r.owner.login === owner)
      .filter((r) => !ql || r.full_name.toLowerCase().includes(ql) || (r.description || '').toLowerCase().includes(ql));
  }, [repos, owner, q]);

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/dashboard/deploy')} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Projects
      </button>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Step 1 of 2</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          Import <em className="italic text-muted-foreground">Git Repository</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2">
          Pick a repository to deploy. We'll auto-detect your framework and create a project on the platform.
        </p>
      </div>

      {!gh.connected ? (
        <div className="border border-border p-10 text-center">
          <Github className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-editorial text-xl mb-1">Connect GitHub</h3>
          <p className="text-[13px] text-muted-foreground mb-4">Authorize access to import your repositories.</p>
          <Button onClick={startGithubOAuth} className="gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white">
            <Github className="h-4 w-4" /> Continue with GitHub
          </Button>
        </div>
      ) : (
        <>
          {/* Owner + search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="h-10 pl-3 pr-8 text-[13px] font-mono bg-background border border-border rounded-md appearance-none min-w-[180px]"
              >
                <option value="all">All accounts</option>
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
            <div className="flex-1 flex items-center gap-2 border border-border px-3 h-10 rounded-md">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent outline-none text-[13px] font-mono"
              />
              <span className="text-[11px] font-mono text-muted-foreground">{filtered.length}/{repos.length}</span>
            </div>
          </div>

          {/* Repo list — scrollable, max ~8 rows visible */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
              {loading && (
                <div className="px-4 py-12 text-center text-[13px] text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading repositories…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No repositories match.</div>
              )}
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition group">
                  <img src={r.owner.avatar_url} className="h-7 w-7 rounded-md shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] truncate">{r.full_name}</span>
                      {r.private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {r.language || '—'} · {r.default_branch} · {formatDistanceToNow(new Date(r.pushed_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/dashboard/deploy/new/configure?repo=${encodeURIComponent(r.full_name)}&id=${r.id}`)}
                    className="gap-1.5"
                  >
                    Import <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
