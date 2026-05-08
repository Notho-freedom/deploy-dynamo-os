import { Link, useNavigate } from 'react-router-dom';
import { useT, useI18n } from '@/lib/i18n';
import { Wordmark } from '@/components/Logo';
import { useApp } from '@/lib/store';

export function SiteHeader() {
  const t = useT();
  const { lang, setLang } = useI18n();
  const user = useApp((s) => s.user);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
        <Link to="/" className="text-foreground hover:opacity-80 transition">
          <Wordmark />
        </Link>
        <nav className="ml-10 hidden md:flex items-center gap-7 text-[13px] text-muted-foreground">
          <a href="#modules" className="hover:text-foreground transition">{t.nav.features}</a>
          <a href="#how" className="hover:text-foreground transition">{lang === 'fr' ? 'Comment ça marche' : 'How it works'}</a>
          <a href="#pricing" className="hover:text-foreground transition">{t.nav.pricing}</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
          >
            {lang.toUpperCase()} ↔ {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="ml-2 px-3 py-1.5 text-[13px] border border-border hover:border-foreground rounded-md transition">
              {lang === 'fr' ? 'Ouvrir l\'app' : 'Open app'} →
            </button>
          ) : (
            <>
              <Link to="/auth" className="ml-2 px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition">
                {t.nav.login}
              </Link>
              <Link to="/auth" className="px-3 py-1.5 text-[13px] bg-foreground text-background hover:bg-foreground/90 rounded-md transition">
                {t.nav.start}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
