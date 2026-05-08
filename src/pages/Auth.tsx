import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/store';
import { useT, useI18n } from '@/lib/i18n';
import { Wordmark } from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Github, ArrowRight, Mail } from 'lucide-react';
import heroImg from '@/assets/hero.jpg';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const login = useApp((s) => s.login);
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useI18n();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setTimeout(() => {
      login(email);
      navigate('/dashboard');
    }, 900);
  };

  const oauth = (provider: string) => {
    setSent(true);
    setTimeout(() => {
      login(`${provider}-user@nebulaos.app`);
      navigate('/dashboard');
    }, 700);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Editorial left panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 border-r border-border overflow-hidden">
        <div className="absolute inset-0 wax-accent opacity-60 -z-10" />
        <Link to="/"><Wordmark /></Link>
        <div className="max-w-md">
          <img src={heroImg} alt="" width={400} height={400} className="w-44 h-44 object-cover mb-8 grayscale-[10%]" />
          <p className="font-editorial italic text-3xl leading-snug text-pretty">
            {lang === 'fr'
              ? '« Construire en Afrique ne devrait pas être plus dur. Cela devrait être plus libre. »'
              : '"Building in Africa shouldn\'t be harder. It should be freer."'}
          </p>
          <p className="mt-6 text-[12px] font-mono text-muted-foreground">— manifesto, NebulaOS</p>
        </div>
        <div className="bogolan-stripe h-1 opacity-40" />
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12 relative">
        <Link to="/" className="lg:hidden absolute top-6 left-6"><Wordmark /></Link>
        <div className="w-full max-w-sm">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
            {mode === 'signin' ? (lang === 'fr' ? 'Connexion' : 'Sign in') : (lang === 'fr' ? 'Inscription' : 'Create account')}
          </p>
          <h1 className="font-editorial text-4xl mb-2">
            {mode === 'signin' ? t.auth.welcome : t.auth.welcomeNew}
          </h1>
          <p className="text-[13px] text-muted-foreground mb-8">
            {mode === 'signin' ? t.auth.subtitle : t.auth.subtitleNew}
          </p>

          <div className="space-y-2">
            <button onClick={() => oauth('github')} className="w-full flex items-center justify-center gap-2 border border-border hover:border-foreground rounded-md px-3 py-2.5 text-[13px] transition">
              <Github className="h-4 w-4" /> {lang === 'fr' ? 'Continuer avec GitHub' : 'Continue with GitHub'}
            </button>
            <button onClick={() => oauth('google')} className="w-full flex items-center justify-center gap-2 border border-border hover:border-foreground rounded-md px-3 py-2.5 text-[13px] transition">
              <GoogleIcon /> {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="flex-1 h-px bg-border" />
            <span>{lang === 'fr' ? 'ou' : 'or'}</span>
            <span className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.auth.name} className="h-10" />
            )}
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.email} required className="h-10 font-mono text-[13px]" />
            <Button type="submit" disabled={sent} className="w-full h-10 group">
              {sent
                ? (lang === 'fr' ? 'Lien envoyé…' : 'Link sent…')
                : (
                  <>
                    <Mail className="h-4 w-4" /> {lang === 'fr' ? 'Recevoir un lien magique' : 'Send magic link'}
                  </>
                )}
            </Button>
          </form>

          <p className="text-[12px] text-muted-foreground mt-8 text-center">
            {mode === 'signin' ? t.auth.noAccount : t.auth.hasAccount}{' '}
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-foreground hover:text-primary border-b border-foreground/30 hover:border-primary transition">
              {mode === 'signin' ? t.auth.createOne : t.auth.loginNow}
            </button>
          </p>

          <p className="text-[10px] text-muted-foreground/70 mt-12 text-center max-w-xs mx-auto leading-relaxed">
            {lang === 'fr' ? 'En continuant, vous acceptez nos conditions et notre politique de confidentialité.' : 'By continuing you agree to our terms and privacy policy.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17a6 6 0 0 1-9-3.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 4 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6A6 6 0 0 1 12 6z" />
    </svg>
  );
}
