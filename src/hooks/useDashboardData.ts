import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface AsyncState {
  loading: boolean;
  error: string | null;
}

function messageForDeployment(deployment: VercelDeployment) {
  return deployment.meta?.githubCommitMessage || deployment.name || 'Deployment';
}

function branchForDeployment(deployment: VercelDeployment, fallback: string) {
  return deployment.meta?.githubCommitRef || fallback;
}

function commitForDeployment(deployment: VercelDeployment) {
  return deployment.meta?.githubCommitSha?.slice(0, 7) || 'unknown';
}

function durationForDeployment(deployment: VercelDeployment) {
  if (!deployment.ready || !deployment.created) return null;
  return Math.max(0, Math.round((deployment.ready - deployment.created) / 1000));
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
    branch: branchForDeployment(deployment, project.branch),
    commitSha: commitForDeployment(deployment),
    created: deployment.created,
    duration: durationForDeployment(deployment),
    url: deployment.url,
  };
}

export function useUserProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<UserProjectRecord[]>([]);
  const [state, setState] = useState<AsyncState>({ loading: true, error: null });

  const refresh = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setState({ loading: false, error: null });
      return;
    }

    setState({ loading: true, error: null });
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setProjects([]);
      setState({ loading: false, error: error.message });
      return;
    }

    setProjects((data || []) as UserProjectRecord[]);
    setState({ loading: false, error: null });
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, refresh, ...state };
}

export function useRecentDeployments(projects: UserProjectRecord[], perProject = 8) {
  const [rows, setRows] = useState<DeploymentRow[]>([]);
  const [latestByProject, setLatestByProject] = useState<Record<string, VercelDeployment | null>>({});
  const [state, setState] = useState<AsyncState>({ loading: false, error: null });

  const projectKey = useMemo(() => projects.map((project) => project.vercel_project_id).join('|'), [projects]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (projects.length === 0) {
        setRows([]);
        setLatestByProject({});
        setState({ loading: false, error: null });
        return;
      }

      setState({ loading: true, error: null });
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

      if (!active) return;

      const nextRows = results
        .flatMap(({ project, deployments }) => deployments.map((deployment) => toDeploymentRow(project, deployment)))
        .sort((a, b) => b.created - a.created);

      const latest = results.reduce<Record<string, VercelDeployment | null>>((acc, result) => {
        acc[result.project.vercel_project_id] = result.deployments[0] || null;
        return acc;
      }, {});

      const firstError = results.find((result) => result.error)?.error || null;
      setRows(nextRows);
      setLatestByProject(latest);
      setState({ loading: false, error: firstError });
    }

    void load();
    return () => {
      active = false;
    };
  }, [projectKey, projects, perProject]);

  return { rows, latestByProject, ...state };
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
    loading: loading || deployments.loading,
    error: error || deployments.error,
    refresh,
  };
}

export function useProjectDeployments(projectId?: string, limit = 20) {
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [state, setState] = useState<AsyncState>({ loading: true, error: null });

  const refresh = useCallback(async () => {
    if (!projectId) {
      setDeployments([]);
      setState({ loading: false, error: null });
      return;
    }

    setState({ loading: true, error: null });
    try {
      const result = await vercel.listDeployments(projectId, limit);
      setDeployments(result.deployments || []);
      setState({ loading: false, error: null });
    } catch (error) {
      setDeployments([]);
      setState({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  }, [projectId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { deployments, refresh, ...state };
}
