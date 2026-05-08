import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Github, Check, Loader2, ShieldCheck } from 'lucide-react';

export function GitHubOAuthDialog({
  open,
  onOpenChange,
  onAuthorized,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuthorized: () => void;
}) {
  const [stage, setStage] = useState<'consent' | 'authorizing' | 'done'>('consent');

  useEffect(() => {
    if (!open) setStage('consent');
  }, [open]);

  const authorize = () => {
    setStage('authorizing');
    setTimeout(() => {
      setStage('done');
      setTimeout(() => {
        onAuthorized();
        onOpenChange(false);
      }, 700);
    }, 1400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden border-0 max-w-md bg-[#0d1117] text-[#e6edf3]">
        {/* Mock GitHub header */}
        <div className="bg-[#010409] border-b border-[#30363d] px-4 py-3 flex items-center gap-2">
          <Github className="h-5 w-5" />
          <span className="text-sm">github.com</span>
          <span className="text-xs text-[#7d8590] ml-auto font-mono">/login/oauth/authorize</span>
        </div>

        {stage === 'consent' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-primary/15 border border-primary/40 flex items-center justify-center rounded">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm leading-tight">
                <p className="text-[#7d8590] text-xs">Authorize</p>
                <p className="font-medium">NebulaOS</p>
              </div>
            </div>
            <p className="text-sm text-[#e6edf3] mb-4">
              <span className="font-medium">NebulaOS</span> by nebulaos wants to access your <span className="font-mono">akua</span> account
            </p>
            <ul className="text-[13px] space-y-2 text-[#e6edf3] border-t border-[#30363d] pt-4">
              {[
                'Verify your identity',
                'Read your public profile and email',
                'Read and write access to all repositories',
                'Manage webhooks and deploy keys',
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#3fb950] mt-0.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 px-3 py-1.5 text-sm border border-[#30363d] rounded-md hover:bg-[#161b22]"
              >
                Cancel
              </button>
              <button
                onClick={authorize}
                className="flex-1 px-3 py-1.5 text-sm bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-medium"
              >
                Authorize NebulaOS
              </button>
            </div>
            <p className="text-[11px] text-[#7d8590] mt-4 text-center">Authorizing will redirect to https://nebulaos.app</p>
          </div>
        )}

        {stage === 'authorizing' && (
          <div className="p-10 flex flex-col items-center gap-3 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#7d8590]" />
            <p className="text-[#7d8590]">Redirecting to nebulaos.app…</p>
          </div>
        )}

        {stage === 'done' && (
          <div className="p-10 flex flex-col items-center gap-3 text-sm">
            <div className="h-10 w-10 rounded-full bg-[#238636] flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
            <p>Authorized</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
