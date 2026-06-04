import { useEffect, useMemo, useState } from 'react';
import { github, GhOrg, GhRepo } from '@/lib/github';
import { useIntegration } from '@/hooks/useIntegration';

export function useGithubRepos() {
  const integration = useIntegration('github');
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [orgs, setOrgs] = useState<GhOrg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!integration.connected) {
      setRepos([]);
      setOrgs([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([github.myRepos(), github.myOrgs().catch(() => [] as GhOrg[])])
      .then(([nextRepos, nextOrgs]) => {
        if (!active) return;
        setRepos(nextRepos);
        setOrgs(nextOrgs);
      })
      .catch((nextError) => {
        if (!active) return;
        setRepos([]);
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [integration.connected]);

  const owners = useMemo(() => {
    const names = new Set<string>();
    repos.forEach((repo) => names.add(repo.owner.login));
    orgs.forEach((org) => names.add(org.login));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [orgs, repos]);

  return { ...integration, repos, orgs, owners, loading: integration.loading || loading, error };
}
