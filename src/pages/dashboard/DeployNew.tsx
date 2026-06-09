import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bot, Boxes, Code2, Github, Globe, Loader2, Lock, Plus, RefreshCw, Search, Sparkles, Workflow } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, SelectFilter } from '@/components/dashboard/DashboardPrimitives';
import { startGithubOAuth } from '@/lib/github';
import { useGithubRepos } from '@/hooks/useGithubRepos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function DeployNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const githubRepos = useGithubRepos();
  const [owner, setOwner] = useState('all');
  const [query, setQuery] = useState('');
  const [creatingEmpty, setCreatingEmpty] = useState(false);

  const filteredRepos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return githubRepos.repos
      .filter((repo) => owner === 'all' || repo.owner.login === owner)
      .filter((repo) => !normalized || repo.full_name.toLowerCase().includes(normalized) || (repo.description || '').toLowerCase().includes(normalized));
  }, [githubRepos.repos, owner, query]);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
        <button onClick={() => navigate('/dashboard/deploy')} className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-[14px] font-semibold">New Project</h1>
        <div className="w-16" />
      </div>

      <div className="mx-auto max-w-[1180px] px-4 py-10 md:px-6">
        <div className="mb-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-[28px] font-semibold tracking-normal md:text-[34px]">Let's build something new</h2>
            <Button variant="outline" className="hidden gap-2 md:inline-flex">
              <Sparkles className="h-4 w-4" />
              Collaborate on a Pro Trial
            </Button>
          </div>

          <div className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-4">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              placeholder="Ask AI to build or enter a Git repository URL..."
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Contact Form', 'Image Editor', 'Mini Game', 'Finance Calculator'].map((suggestion) => (
              <button key={suggestion} className="rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:border-foreground/40 hover:text-foreground">
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 border-y border-border py-8 lg:grid-cols-[1fr_1px_1.2fr]">
          <section className="min-w-0">
            <h3 className="mb-5 text-[20px] font-semibold">Import Git Repository</h3>

            {!githubRepos.connected ? (
              <EmptyPanel
                icon={<Github className="h-10 w-10" />}
                title="Connect GitHub"
                description="Authorize GitHub to list your real repositories. No placeholder repositories are shown here."
                action={
                  <Button onClick={startGithubOAuth} className="gap-2">
                    <Github className="h-4 w-4" />
                    Continue with GitHub
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-[240px_1fr]">
                  <SelectFilter
                    label="GitHub account"
                    value={owner}
                    onChange={setOwner}
                    options={[
                      { label: 'All accounts', value: 'all' },
                      ...githubRepos.owners.map((name) => ({ label: name, value: name })),
                    ]}
                  />
                  <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search..."
                      className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                    />
                  </label>
                </div>

                {githubRepos.error && (
                  <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
                    GitHub repositories could not be loaded: {githubRepos.error}
                  </div>
                )}

                <div className="overflow-hidden rounded-md border border-border bg-card">
                  <div className="max-h-[430px] divide-y divide-border overflow-y-auto">
                    {githubRepos.loading && githubRepos.repos.length === 0 ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                          <Skeleton className="h-7 w-16 rounded-md" />
                        </div>
                      ))
                    ) : filteredRepos.length === 0 ? (
                      <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No repositories match.</div>
                    ) : (
                      filteredRepos.map((repo) => (
                        <div key={repo.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/30">
                          <img src={repo.owner.avatar_url} className="h-8 w-8 shrink-0 rounded-md" alt="" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13px] font-semibold">{repo.name}</p>
                              {repo.private && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {repo.full_name} · {repo.language || 'Unknown'} · {repo.default_branch} · {formatDistanceToNow(new Date(repo.pushed_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/dashboard/deploy/new/configure?repo=${encodeURIComponent(repo.full_name)}&id=${repo.id}`)}
                            className="gap-1.5"
                          >
                            Import
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  {githubRepos.refreshing && (
                    <div className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Refreshing in background…
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="hidden bg-border lg:block" />

          <section className="space-y-8">
            <div>
              <h3 className="mb-5 text-[20px] font-semibold">AI building blocks</h3>
              <div className="space-y-3">
                <FeatureRow icon={<Bot className="h-4 w-4" />} title="AI Gateway" description="One endpoint for model providers. Coming soon in this workspace." />
                <FeatureRow icon={<Boxes className="h-4 w-4" />} title="Sandboxes" description="Run generated code in isolated environments once the backend is connected." />
                <FeatureRow icon={<Workflow className="h-4 w-4" />} title="Workflows" description="Long-running jobs will appear here when a workflow source exists." />
              </div>
            </div>

            <div>
              <p className="mb-3 text-[13px] text-muted-foreground">Looking for something else?</p>
              <FeatureRow
                icon={<Code2 className="h-4 w-4" />}
                title="Create Empty Project"
                description="Not connected yet. Import from GitHub for a real project source."
                action={<Button disabled variant="outline" size="sm">Create</Button>}
              />
            </div>
          </section>
        </div>

        <section className="py-8">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[20px] font-semibold">Clone Template</h3>
            <span className="text-[12px] text-muted-foreground">No template source connected</span>
          </div>
          <EmptyPanel
            title="Templates are not connected"
            description="A real template catalog can be wired here later. For now, this page only shows real GitHub repositories."
          />
        </section>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action || <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </div>
  );
}
