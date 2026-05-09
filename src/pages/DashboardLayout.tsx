import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink, useLocation, Link } from 'react-router-dom';
import { useApp } from '@/lib/store';
import { useT, useI18n } from '@/lib/i18n';
import { Wordmark, Logo } from '@/components/Logo';
import {
  LayoutGrid, Sparkles, Layout, Database, Rocket, Globe, Mail, GitBranch, Activity, Wallet, Settings as Cog,
  LogOut, Search, ChevronDown, Plus,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { StatusDot } from '@/components/StatusDot';
import { cn } from '@/lib/utils';

const DashboardLayout = ({ children }: { children?: ReactNode }) => {
  const user = useApp((s) => s.user);
  const projects = useApp((s) => s.projects);
  const logout = useApp((s) => s.logout);
  const navigate = useNavigate();
  const t = useT();
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [project, setProject] = useState(projects[0]);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!user) return null;

  const groups: Array<{ label: string; items: Array<{ to: string; icon: any; label: string; end?: boolean }> }> = [
    {
      label: 'Workspace',
      items: [
        { to: '/dashboard', icon: LayoutGrid, label: lang === 'fr' ? 'Vue d\'ensemble' : 'Overview', end: true },
        { to: '/dashboard/billing', icon: Wallet, label: t.modules.billing.name },
        { to: '/dashboard/domains', icon: Globe, label: t.modules.domain.name },
        { to: '/dashboard/email', icon: Mail, label: t.modules.email.name },
      ],
    },
    {
      label: 'Project',
      items: [
        { to: '/dashboard/builder', icon: Sparkles, label: t.modules.builder.name },
        { to: '/dashboard/ui', icon: Layout, label: t.modules.ui.name },
        { to: '/dashboard/backend', icon: Database, label: t.modules.backend.name },
        { to: '/dashboard/deploy', icon: Rocket, label: t.modules.deploy.name },
        { to: '/dashboard/cicd', icon: GitBranch, label: t.modules.cicd.name },
        { to: '/dashboard/monitoring', icon: Activity, label: t.modules.monitoring.name },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/dashboard/settings', icon: Cog, label: 'Settings' },
      ],
    },
  ];

  // breadcrumb
  const seg = location.pathname.split('/').filter(Boolean); // ['dashboard', 'deploy']
  const sectionLabel = (() => {
    if (seg.length <= 1) return lang === 'fr' ? 'Vue d\'ensemble' : 'Overview';
    const all = groups.flatMap((g) => g.items);
    return all.find((i) => i.to === location.pathname)?.label ?? seg[1];
  })();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-[244px] shrink-0 flex-col border-r border-border bg-background">
        <div className="h-14 px-5 flex items-center border-b border-border">
          <Link to="/" className="hover:opacity-80 transition"><Wordmark /></Link>
        </div>

        {/* project switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mx-3 mt-4 flex items-center gap-3 px-3 py-2.5 border border-border hover:border-foreground/40 rounded-md text-left transition-colors">
              <span className="h-6 w-6 rounded gradient-cosmic bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-mono text-primary">
                {project?.name[0].toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-mono truncate leading-tight">{project?.name}</p>
                <p className="text-[10.5px] text-muted-foreground truncate font-mono leading-tight mt-0.5">{project?.framework}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Projects</DropdownMenuLabel>
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => setProject(p)} className="font-mono text-[12px]">
                {p.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/builder')}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="flex-1 overflow-y-auto py-5">
          {groups.map((g, gi) => (
            <div key={g.label} className={cn(gi > 0 && 'mt-7')}>
              <p className="px-6 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 font-mono">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.to} className="relative px-3">
                    <NavLink
                      to={it.to}
                      end={it.end}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 px-3 py-2 text-[13px] font-mono rounded-md transition-colors',
                          isActive
                            ? 'text-foreground bg-muted/40'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/20',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute -left-px top-2 bottom-2 w-[2px] bg-primary rounded-r" />}
                          <it.icon className={cn('h-3.5 w-3.5 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground')} />
                          <span className="truncate">{it.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <StatusDot tone="success" /> All systems normal
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-14 flex items-center px-5 gap-5 border-b border-border bg-background sticky top-0 z-30">
          <div className="flex items-center gap-2 text-[12px] font-mono text-muted-foreground min-w-0">
            <span className="hidden sm:inline">akua</span>
            <span className="hidden sm:inline">/</span>
            <span className="hidden sm:inline truncate">{project?.name}</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-foreground truncate">{sectionLabel}</span>
          </div>

          <button
            onClick={() => setCmdOpen(true)}
            className="ml-auto flex items-center gap-2 border border-border hover:border-foreground/40 rounded-md px-2.5 py-1 text-[12px] text-muted-foreground transition w-56 max-w-[40vw]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{lang === 'fr' ? 'Rechercher…' : 'Search…'}</span>
            <kbd className="hidden md:inline font-mono text-[10px] border border-border px-1 py-0.5 rounded">⌘K</kbd>
          </button>

          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition"
            title="Switch language"
          >
            {lang.toUpperCase()}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-mono text-[11px] text-primary">
                {user.name[0]?.toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium text-[13px]">{user.name}</p>
                <p className="text-[11px] text-muted-foreground font-normal font-mono">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                <Cog className="h-3.5 w-3.5 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/billing')}>
                <Wallet className="h-3.5 w-3.5 mr-2" /> Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); navigate('/'); }}>
                <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">{children || <Outlet />}</div>
        </main>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder={lang === 'fr' ? 'Rechercher un projet, une action…' : 'Search projects, actions…'} />
        <CommandList>
          <CommandEmpty>{lang === 'fr' ? 'Aucun résultat.' : 'No results.'}</CommandEmpty>
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem key={p.id} onSelect={() => { setProject(p); setCmdOpen(false); }}>
                <Logo size={14} className="text-primary mr-2" />
                <span className="font-mono">{p.name}</span>
                <span className="text-muted-foreground text-xs ml-auto">{p.framework}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            {[
              { label: lang === 'fr' ? 'Nouveau projet' : 'New project', to: '/dashboard/builder' },
              { label: lang === 'fr' ? 'Déployer' : 'Deploy', to: '/dashboard/deploy' },
              { label: lang === 'fr' ? 'Recharger le wallet' : 'Top up wallet', to: '/dashboard/billing' },
              { label: lang === 'fr' ? 'Acheter un domaine' : 'Buy a domain', to: '/dashboard/domains' },
            ].map((a) => (
              <CommandItem key={a.to} onSelect={() => { setCmdOpen(false); navigate(a.to); }}>
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

export default DashboardLayout;
