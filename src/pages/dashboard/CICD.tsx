import { useNavigate } from 'react-router-dom';
import { useIntegration } from '@/hooks/useIntegration';
import { Button } from '@/components/ui/button';
import { startGithubOAuth } from '@/lib/github';
import { Github, Triangle, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CICD() {
  const navigate = useNavigate();
  const gh = useIntegration('github');

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">CI / CD</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          Push. <em className="italic text-muted-foreground">Build. Ship.</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2">
          Connect GitHub once, then import any repository from the Deploy page.
        </p>
      </div>

      {/* GitHub connection */}
      <div className="border border-border rounded-md p-5 flex items-center gap-4">
        <span className="h-10 w-10 rounded-md border border-border flex items-center justify-center"><Github className="h-4 w-4" /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[14px]">GitHub</span>
            {gh.connected ? (
              <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">Connected</span>
            ) : (
              <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">Off</span>
            )}
          </div>
          <p className="text-[12px] font-mono text-muted-foreground truncate">
            {gh.connected ? gh.connection?.metadata?.login || 'authorized' : 'Authorize to list your repositories.'}
          </p>
        </div>
        {gh.connected ? (
          <Button variant="outline" onClick={async () => { await gh.disconnect(); toast.success('GitHub disconnected'); }}>Disconnect</Button>
        ) : (
          <Button onClick={startGithubOAuth} className="gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white">
            <Github className="h-4 w-4" /> Connect GitHub
          </Button>
        )}
      </div>

      {/* Hosting — managed */}
      <div className="border border-border rounded-md p-5 flex items-center gap-4">
        <span className="h-10 w-10 rounded-md border border-border flex items-center justify-center"><Triangle className="h-4 w-4 fill-current" /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[14px]">Hosting</span>
            <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">Managed</span>
          </div>
          <p className="text-[12px] font-mono text-muted-foreground inline-flex items-center gap-1.5">
            <Check className="h-3 w-3 text-success" /> Deployments are handled by the platform — no setup required.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <Button
          onClick={() => navigate('/dashboard/deploy/new')}
          disabled={!gh.connected}
          size="lg"
          className="gap-2"
        >
          Import a repository <ArrowRight className="h-4 w-4" />
        </Button>
        {!gh.connected && (
          <p className="text-[11px] font-mono text-muted-foreground mt-2">Connect GitHub above to enable imports.</p>
        )}
      </div>
    </div>
  );
}
