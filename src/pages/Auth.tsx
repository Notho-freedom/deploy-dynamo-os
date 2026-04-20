import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useT, useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { Sparkles, Github, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const t = useT();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isSignup = params.get('mode') === 'signup';
  const login = useApp((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      login(email);
      toast({ title: isSignup ? '🎉 Account created' : '👋 Welcome back', description: email });
      navigate('/dashboard');
    }, 800);
  };

  const handleOAuth = (provider: string) => {
    setLoading(true);
    setTimeout(() => {
      login(`user@${provider}.demo`);
      toast({ title: `Signed in with ${provider}` });
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="fixed inset-0 -z-10 wax-pattern" />
      <div className="fixed inset-0 -z-10 stars-bg opacity-50" />
      <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] -z-10 rounded-full bg-primary/20 blur-[120px]" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] -z-10 rounded-full bg-secondary/20 blur-[120px]" />

      <button
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        className="fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md glass text-sm font-medium"
      >
        <Globe className="h-3.5 w-3.5" /> <span className="font-mono">{lang.toUpperCase()}</span>
      </button>

      <Card className="glass p-8 w-full max-w-md glow">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl gradient-cosmic flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">Nebula<span className="text-gradient-cosmic">OS</span></span>
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold mb-1">
            {isSignup ? t.auth.welcomeNew : t.auth.welcome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignup ? t.auth.subtitleNew : t.auth.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button variant="outline" onClick={() => handleOAuth('github')} disabled={loading}>
            <Github className="h-4 w-4" /> GitHub
          </Button>
          <Button variant="outline" onClick={() => handleOAuth('google')} disabled={loading}>
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t.auth.orContinue}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <Label htmlFor="name">{t.auth.name}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Akua Mensah" />
            </div>
          )}
          <div>
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nebula.dev" required />
          </div>
          <div>
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-cosmic glow">
            {loading ? t.common.loading : isSignup ? t.auth.signup : t.auth.login}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignup ? t.auth.hasAccount : t.auth.noAccount}{' '}
          <Link to={isSignup ? '/auth' : '/auth?mode=signup'} className="text-primary hover:underline font-medium">
            {isSignup ? t.auth.loginNow : t.auth.createOne}
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default Auth;
