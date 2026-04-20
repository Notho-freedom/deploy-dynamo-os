import { useT } from '@/lib/i18n';
import { Sparkles } from 'lucide-react';

export const SiteFooter = () => {
  const t = useT();
  return (
    <footer className="border-t border-border/50 mt-32">
      <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg gradient-cosmic flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">NebulaOS</span>
          </div>
          <p className="text-sm text-muted-foreground">🌍 Made in Africa.</p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">{t.footer.product}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#modules" className="hover:text-foreground">Modules</a></li>
            <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
            <li><a href="#" className="hover:text-foreground">Changelog</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">{t.footer.company}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">About</a></li>
            <li><a href="#" className="hover:text-foreground">Blog</a></li>
            <li><a href="#" className="hover:text-foreground">Careers</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">{t.footer.legal}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Terms</a></li>
            <li><a href="#" className="hover:text-foreground">Privacy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        © 2026 NebulaOS — {t.footer.rights}
      </div>
    </footer>
  );
};
