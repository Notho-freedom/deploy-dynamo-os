import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { github, GhOrg, GhRepo } from '@/lib/github';
import { useIntegration } from '@/hooks/useIntegration';

export function useGithubRepos() {
  const integration = useIntegration('github');

  const query = useQuery({
    queryKey: ['github-repos', integration.connected],
    enabled: integration.connected,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [repos, orgs] = await Promise.all([
        github.myRepos(),
        github.myOrgs().catch(() => [] as GhOrg[]),
      ]);
      return { repos, orgs };
    },
  });

  const repos = query.data?.repos ?? [];
  const orgs = query.data?.orgs ?? [];

  const owners = useMemo(() => {
    const names = new Set<string>();
    repos.forEach((repo: GhRepo) => names.add(repo.owner.login));
    orgs.forEach((org: GhOrg) => names.add(org.login));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [orgs, repos]);

  return {
    ...integration,
    repos,
    orgs,
    owners,
    // Only show loading if no cached data is available.
    loading: integration.loading || (query.isLoading && !query.data),
    refreshing: query.isFetching && !!query.data,
    error: query.error ? (query.error as Error).message : null,
  };
}
