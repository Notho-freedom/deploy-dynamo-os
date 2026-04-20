import { ReactNode, useEffect } from 'react';
import { Outlet, useNavigate, NavLink as RouterNavLink, useLocation, Link } from 'react-router-dom';
import { useApp } from '@/lib/store';
import { useT, useI18n } from '@/lib/i18n';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarHeader,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Sparkles, Layout, Database, Rocket, Globe, Mail, GitBranch, Activity, Wallet, Settings, LogOut, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const DashboardLayout = ({ children }: { children?: ReactNode }) => {
  const user = useApp((s) => s.user);
  const logout = useApp((s) => s.logout);
  const navigate = useNavigate();
  const t = useT();
  const { lang, setLang } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  const items = [
    { title: t.dash.title, url: '/dashboard', icon: LayoutDashboard, end: true },
    { title: t.modules.builder.name, url: '/dashboard/builder', icon: Sparkles },
    { title: t.modules.ui.name, url: '/dashboard/ui', icon: Layout },
    { title: t.modules.backend.name, url: '/dashboard/backend', icon: Database },
    { title: t.modules.deploy.name, url: '/dashboard/deploy', icon: Rocket },
    { title: t.modules.domain.name, url: '/dashboard/domains', icon: Globe },
    { title: t.modules.email.name, url: '/dashboard/email', icon: Mail },
    { title: t.modules.cicd.name, url: '/dashboard/cicd', icon: GitBranch },
    { title: t.modules.monitoring.name, url: '/dashboard/monitoring', icon: Activity },
    { title: t.modules.billing.name, url: '/dashboard/billing', icon: Wallet },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="fixed inset-0 -z-10 stars-bg opacity-20" />

        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2 px-2 py-2">
              <div className="h-8 w-8 rounded-lg gradient-cosmic flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg group-data-[collapsible=icon]:hidden">
                Nebula<span className="text-gradient-cosmic">OS</span>
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive = item.end ? location.pathname === item.url : location.pathname.startsWith(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <RouterNavLink to={item.url} end={item.end}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </RouterNavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Settings" isActive={location.pathname === '/dashboard/settings'}>
                      <RouterNavLink to="/dashboard/settings">
                        <Settings className="h-4 w-4" /> <span>Settings</span>
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border/50 glass flex items-center px-4 gap-3 sticky top-0 z-40">
            <SidebarTrigger />
            <div className="flex-1" />
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted text-sm font-medium font-mono"
            >
              <Globe className="h-3.5 w-3.5" /> {lang.toUpperCase()}
            </button>
            <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full gradient-cosmic flex items-center justify-center font-semibold text-primary-foreground glow">
                  {user.name[0]?.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate('/'); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
