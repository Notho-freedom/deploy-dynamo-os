import { Link } from 'react-router-dom';
import { useT, useI18n } from '@/lib/i18n';
import { Logo } from '@/components/Logo';

export function SiteFooter() {
  const t = useT();
  const { lang } = useI18n();
  return (
    <footer className="border-t border-border mt-32">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Logo size={28} className="text-primary" />
            <p className="font-editorial italic text-lg mt-6 text-pretty leading-snug max-w-xs">
              {lang === 'fr'
                ? 'Concevoir, déployer et facturer depuis un seul endroit. Pensé en Afrique, fait pour le monde.'
                : 'Design, ship and bill from one place. Built in Africa, made for the world.'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{t.footer.product}</p>
            <ul className="space-y-2.5 text-[13px]">
              <li><a href="#modules" className="hover:text-primary transition">{t.nav.features}</a></li>
              <li><a href="#pricing" className="hover:text-primary transition">{t.nav.pricing}</a></li>
              <li><a href="#how" className="hover:text-primary transition">{lang === 'fr' ? 'Comment ça marche' : 'How it works'}</a></li>
              <li><Link to="/dashboard" className="hover:text-primary transition">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{t.footer.company}</p>
            <ul className="space-y-2.5 text-[13px]">
              <li><a className="hover:text-primary transition" href="#">{lang === 'fr' ? 'À propos' : 'About'}</a></li>
              <li><a className="hover:text-primary transition" href="#">{lang === 'fr' ? 'Manifeste' : 'Manifesto'}</a></li>
              <li><a className="hover:text-primary transition" href="#">Careers</a></li>
              <li><a className="hover:text-primary transition" href="#">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{t.footer.legal}</p>
            <ul className="space-y-2.5 text-[13px]">
              <li><a className="hover:text-primary transition" href="#">{lang === 'fr' ? 'Confidentialité' : 'Privacy'}</a></li>
              <li><a className="hover:text-primary transition" href="#">Terms</a></li>
              <li><a className="hover:text-primary transition" href="#">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="bogolan-stripe h-1 mt-16 mb-6 opacity-50" />
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-[12px] text-muted-foreground font-mono">
          <span>© 2026 NebulaOS</span>
          <span className="hidden md:inline">·</span>
          <span>{lang === 'fr' ? 'Abidjan · Lagos · Dakar · Nairobi' : 'Abidjan · Lagos · Dakar · Nairobi'}</span>
          <span className="ml-auto flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" /> All systems normal</span>
        </div>
      </div>
    </footer>
  );
}
