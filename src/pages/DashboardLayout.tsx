import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowLeft,
  Bell,
  Box,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Code2,
  Database,
  GitBranch,
  Globe,
  KeyRound,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  Rocket,
  Search,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  Workflow,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardProjects } from '@/hooks/useDashboardData';
import { useApp } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
}

const productNav: NavItem[] = [
  { to: '/dashboard', label: 'Projects', icon: LayoutGrid, end: true },
  { to: '/dashboard/deploy', label: 'Deployments', icon: Box },
  { to: '/dashboard/logs', label: 'Logs', icon: List },
  { to: '/dashboard/analytics', label: 'Analytics', icon: Activity },
  { to: '/dashboard/observability', label: 'Observability', icon: Zap },
  { to: '/dashboard/cicd', label: 'Integrations', icon: GitBranch },
];

const configNav: NavItem[] = [
  { to: '/dashboard/domains', label: 'Domains', icon: Globe },
  { to: '/dashboard/backend', label: 'Backend', icon: Database },
  { to: '/dashboard/email', label: 'Email', icon: Mail },
  { to: '/dashboard/billing', label: 'Billing', icon: CircleDollarSign },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const platformNav: NavItem[] = [
  { to: '/dashboard/builder', label: 'Builder', icon: Code2 },
  { to: '/dashboard/ui', label: 'UI Generator', icon: Workflow },
];

const backendNav: NavItem[] = [
  { to: '/dashboard/backend', label: 'Overview', icon: Activity, end: true },
  { to: '/dashboard/backend?type=web_service', label: 'Web Services', icon: Server },
  { to: '/dashboard/backend?type=static_site', label: 'Static Sites', icon: Globe },
  { to: '/dashboard/backend?type=background_worker', label: 'Workers', icon: Workflow },
  { to: '/dashboard/backend?type=cron_job', label: 'Cron Jobs', icon: Clock },
  { to: '/dashboard/backend?type=private_service', label: 'Private Services', icon: Box },
  { to: '/dashboard/backend?type=postgres', label: 'Postgres', icon: Database },
  { to: '/dashboard/backend?type=keyvalue', label: 'Key Value', icon: KeyRound },
  { to: '/dashboard/backend/new', label: 'New Service', icon: Plus },
];

function sectionLabel(pathname: string) {
  const all = [...productNav, ...configNav, ...platformNav];
  if (pathname === '/dashboard') return 'Overview';
  if (pathname.includes('/deploy/new')) return 'New Project';
  if (/\/dashboard\/deploy\/[^/]+/.test(pathname)) return 'Deployment Details';
  return all.find((item) => item.to === pathname)?.label || 'Dashboard';
}

function navIsActive(item: NavItem, pathname: string) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const storeLogout = useApp((state) => state.logout);
  const { projects, loading: projectsLoading } = useDashboardProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useI18n();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, navigate, user]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects[0]) setSelectedProjectId(projects[0].projectId);
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.projectId === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );

  if (authLoading || !user) return null;

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Workspace';
  const pageTitle = sectionLabel(location.pathname);

  const sidebar = (
    <DashboardSidebar
      displayName={displayName}
      projectName={selectedProject?.name || 'All Projects'}
      projectsLoading={projectsLoading}
      pathname={location.pathname}
      onNavigate={() => setMobileOpen(false)}
      onSearch={() => setCmdOpen(true)}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-[256px] shrink-0 border-r border-border bg-background md:block">{sidebar}</aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            {sidebar}
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur md:px-5">
            <button onClick={() => setMobileOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border md:hidden" aria-label="Open navigation">
              <Menu className="h-4 w-4" />
            </button>

            <ProjectSwitcher
              projects={projects}
              selectedProjectId={selectedProject?.projectId || null}
              onSelect={setSelectedProjectId}
              loading={projectsLoading}
            />

            <div className="hidden min-w-0 items-center gap-2 text-[13px] text-muted-foreground lg:flex">
              <span>/</span>
              <span className="truncate text-foreground">{pageTitle}</span>
            </div>

            <button
              onClick={() => setCmdOpen(true)}
              className="ml-auto hidden h-8 w-72 max-w-[32vw] items-center gap-2 rounded-md border border-border bg-card px-2.5 text-[12px] text-muted-foreground transition hover:border-foreground/30 md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Find projects, deployments, actions...</span>
              <kbd className="rounded border border-border px-1 text-[10px]">F</kbd>
            </button>

            <button onClick={() => navigate('/dashboard/deploy/new')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add New</span>
            </button>

            <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="h-8 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground">
              {lang.toUpperCase()}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[12px] font-semibold">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : displayName[0]?.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-[13px] font-medium">{displayName}</p>
                  <p className="truncate text-[11px] font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/billing')}>
                  <CircleDollarSign className="mr-2 h-3.5 w-3.5" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); storeLogout(); navigate('/'); }}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="min-h-0 flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-[1600px]">{children || <Outlet />}</div>
          </main>
        </div>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search projects, deployments, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem
                key={project.projectId}
                onSelect={() => {
                  setSelectedProjectId(project.projectId);
                  setCmdOpen(false);
                  navigate(`/dashboard/deploy/${project.projectId}`);
                }}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>{project.name}</span>
                <span className="ml-auto truncate text-[11px] text-muted-foreground">{project.repo}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            {[
              { label: 'Import Git Repository', to: '/dashboard/deploy/new', icon: Plus },
              { label: 'View Deployments', to: '/dashboard/deploy', icon: Rocket },
              { label: 'Manage Domains', to: '/dashboard/domains', icon: Globe },
              { label: 'Open Settings', to: '/dashboard/settings', icon: Settings },
            ].map((item) => (
              <CommandItem key={item.to} onSelect={() => { setCmdOpen(false); navigate(item.to); }}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function DashboardSidebar({
  displayName,
  projectName,
  projectsLoading,
  pathname,
  onNavigate,
  onSearch,
}: {
  displayName: string;
  projectName: string;
  projectsLoading: boolean;
  pathname: string;
  onNavigate: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="flex h-14 items-center gap-2 px-3">
        <Link to="/dashboard" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{displayName[0]?.toUpperCase()}</span>
          <span className="truncate text-[13px] font-semibold">{displayName}'s projects</span>
        </Link>
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground" aria-label="Workspace menu">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2 pb-2">
        <button onClick={onSearch} className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-[13px] text-muted-foreground hover:border-foreground/30">
          <Search className="h-4 w-4" />
          <span className="min-w-0 flex-1">Find...</span>
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">F</kbd>
        </button>
      </div>

      <div className="border-y border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{projectsLoading ? 'Loading projects...' : projectName}</span>
          {projectsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <NavGroup items={productNav} pathname={pathname} onNavigate={onNavigate} />
        <div className="my-3 h-px bg-border" />
        <NavGroup items={configNav} pathname={pathname} onNavigate={onNavigate} />
        <div className="my-3 h-px bg-border" />
        <NavGroup items={platformNav} pathname={pathname} onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-border p-2">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="min-w-0 flex-1">Notifications</span>
        </button>
      </div>
    </div>
  );
}

function NavGroup({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = navIsActive(item, pathname);
        return (
          <li key={`${item.label}-${item.to}`}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={cn(
                'flex h-9 items-center gap-2 rounded-md px-2.5 text-[13px] transition',
                active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge && <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">{item.badge}</span>}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

function ProjectSwitcher({
  projects,
  selectedProjectId,
  onSelect,
  loading,
}: {
  projects: ReturnType<typeof useDashboardProjects>['projects'];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  loading: boolean;
}) {
  const selected = projects.find((project) => project.projectId === selectedProjectId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex min-w-0 max-w-[52vw] items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/40 md:max-w-[360px]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-primary">
            <Rocket className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 truncate text-[13px] font-semibold">{selected?.name || 'All Projects'}</span>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">Projects</DropdownMenuLabel>
        {projects.length === 0 && <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>}
        {projects.map((project) => (
          <DropdownMenuItem key={project.projectId} onClick={() => onSelect(project.projectId)}>
            <span className="min-w-0 flex-1 truncate">{project.name}</span>
            <span className="ml-2 truncate text-[11px] text-muted-foreground">{project.branch}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/deploy/new">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Import Git Repository
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
