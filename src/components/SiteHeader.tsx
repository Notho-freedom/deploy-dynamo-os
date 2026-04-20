import { useT, useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Globe } from 'lucide-react';
import { useApp } from '@/lib/store';

export const SiteHeader = () => {
  const t = useT();
  const { lang, setLang } = useI18n();
  const user = useApp((s) => s.user);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-lg gradient-cosmic flex items-center justify-center glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Nebula<span className="text-gradient-cosmic">OS</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#modules" className="text-muted-foreground hover:text-foreground transition">{t.nav.features}</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">{t.nav.pricing}</a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground transition">{t.nav.docs}</a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm font-medium transition"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="font-mono">{lang.toUpperCase()}</span>
          </button>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} className="gradient-cosmic glow">
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/auth')}>{t.nav.login}</Button>
              <Button onClick={() => navigate('/auth?mode=signup')} className="gradient-cosmic glow">
                {t.nav.start}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
