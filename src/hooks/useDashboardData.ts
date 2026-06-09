import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';
import { vercel, VercelDeployment } from '@/lib/vercel';

export interface UserProjectRecord {
  id: string;
  user_id: string;
  vercel_project_id: string;
  vercel_project_name: string;
  github_repo_full_name: string;
  github_repo_id: number | null;
  branch: string;
  framework: string | null;
  production_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DashboardProject {
  id: string;
  projectId: string;
  name: string;
  repo: string;
  repoId: number | null;
  branch: string;
  framework: string | null;
  productionUrl: string | null;
  latestDeployment: VercelDeployment | null;
  createdAt: string;
}

export interface DeploymentRow {
  uid: string;
  projectId: string;
  projectName: string;
  message: string;
  state: VercelDeployment['state'];
  environment: 'Production' | 'Preview';
  repo: string;
  branch: string;
  commitSha: string;
  created: number;
  duration: number | null;
  url: string;
}

function messageForDeployment(d: VercelDeployment) {
  return d.meta?.githubCommitMessage || d.name || 'Deployment';
}
function commitForDeployment(d: VercelDeployment) {
  return d.meta?.githubCommitSha?.slice(0, 7) || 'unknown';
}
function durationForDeployment(d: VercelDeployment) {
  if (!d.ready || !d.created) return null;
  return Math.max(0, Math.round((d.ready - d.created) / 1000));
}

export function toDeploymentRow(project: UserProjectRecord, deployment: VercelDeployment): DeploymentRow {
  return {
    uid: deployment.uid,
    projectId: project.vercel_project_id,
    projectName: project.vercel_project_name,
    message: messageForDeployment(deployment),
    state: deployment.state,
    environment: deployment.target === 'production' ? 'Production' : 'Preview',
    repo: project.github_repo_full_name,
    branch: deployment.meta?.githubCommitRef || project.branch,
    commitSha: commitForDeployment(deployment),
    created: deployment.created,
    duration: durationForDeployment(deployment),
    url: deployment.url,
  };
}

export function useUserProjects() {
  const { user } = useAuth();
  useRealtimeInvalidate('user_projects', [['user-projects', user?.id]]);

  const query = useQuery<UserProjectRecord[]>({
    queryKey: ['user-projects', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as UserProjectRecord[];
    },
  });

  return {
    projects: query.data ?? [],
    loading: query.isLoading && !query.data,
    error: query.error ? (query.error as Error).message : null,
    refresh: () => void query.refetch(),
  };
}

export function useRecentDeployments(projects: UserProjectRecord[], perProject = 8) {
  const projectKey = useMemo(() => projects.map((p) => p.vercel_project_id).sort().join('|'), [projects]);

  const query = useQuery({
    queryKey: ['recent-deployments', projectKey, perProject],
    enabled: projects.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        projects.map(async (project) => {
          try {
            const result = await vercel.listDeployments(project.vercel_project_id, perProject);
            return { project, deployments: result.deployments || [], error: null as string | null };
          } catch (error) {
            return { project, deployments: [] as VercelDeployment[], error: error instanceof Error ? error.message : String(error) };
          }
        }),
      );
      const rows = results
        .flatMap(({ project, deployments }) => deployments.map((d) => toDeploymentRow(project, d)))
        .sort((a, b) => b.created - a.created);
      const latest = results.reduce<Record<string, VercelDeployment | null>>((acc, r) => {
        acc[r.project.vercel_project_id] = r.deployments[0] || null;
        return acc;
      }, {});
      const firstError = results.find((r) => r.error)?.error || null;
      return { rows, latestByProject: latest, error: firstError };
    },
    refetchInterval: 30_000,
  });

  return {
    rows: query.data?.rows ?? [],
    latestByProject: query.data?.latestByProject ?? {},
    loading: query.isLoading && !query.data,
    error: query.data?.error || (query.error ? (query.error as Error).message : null),
  };
}

export function useDashboardProjects() {
  const { projects, loading, error, refresh } = useUserProjects();
  const deployments = useRecentDeployments(projects, 1);

  const dashboardProjects = useMemo<DashboardProject[]>(
    () =>
      projects.map((project) => ({
        id: project.id,
        projectId: project.vercel_project_id,
        name: project.vercel_project_name,
        repo: project.github_repo_full_name,
        repoId: project.github_repo_id,
        branch: project.branch,
        framework: project.framework,
        productionUrl: project.production_url,
        latestDeployment: deployments.latestByProject[project.vercel_project_id] || null,
        createdAt: project.created_at,
      })),
    [projects, deployments.latestByProject],
  );

  return {
    projects: dashboardProjects,
    rawProjects: projects,
    loading: loading || (deployments.loading && projects.length > 0),
    error: error || deployments.error,
    refresh,
  };
}

export function useProjectDeployments(projectId?: string, limit = 20) {
  const query = useQuery({
    queryKey: ['project-deployments', projectId, limit],
    enabled: !!projectId,
    queryFn: async () => {
      const result = await vercel.listDeployments(projectId!, limit);
      return result.deployments || [];
    },
    refetchInterval: 20_000,
  });
  return {
    deployments: query.data ?? [],
    loading: query.isLoading && !query.data,
    error: query.error ? (query.error as Error).message : null,
    refresh: () => void query.refetch(),
  };
}
