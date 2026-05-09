import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { useT, useI18n } from '@/lib/i18n';
import { Terminal, TerminalLine } from '@/components/Terminal';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import heroImg from '@/assets/hero.jpg';

const heroScript: TerminalLine[] = [
  { tone: 'cmd', text: 'nebula deploy ./kente-shop' },
  { tone: 'muted', text: '↳ detected: Next.js 14 · pnpm · src/app' },
  { text: 'Provisioning edge runtime in 14 regions...' },
  { text: 'Building (esbuild + swc)...' },
  { tone: 'success', text: '✓ Built in 21.4s · 12.8 MB · 38 routes' },
  { text: 'Uploading to global CDN...' },
  { text: 'Provisioning domain  →  kente-shop.nebula.app' },
  { text: 'Linking Postgres  →  db_a8f2 (Lagos · eu-west-2)' },
  { tone: 'success', text: '✓ Ready · https://kente-shop.nebula.app' },
  { tone: 'muted', text: '   Build #142 · main@a8f2c1d · 28.3s · 0 errors' },
];

export default function Index() {
  const t = useT();
  const { lang } = useI18n();
  const [streamed, setStreamed] = useState<TerminalLine[]>([]);
  const [streaming, setStreaming] = useState(true);

  useEffect(() => {
    let i = 0;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setStreamed([]);
    setStreaming(true);
    const tick = () => {
      if (cancelled) return;
      if (i >= heroScript.length) { setStreaming(false); return; }
      const item = heroScript[i];
      if (item) setStreamed((s) => [...s, item]);
      i++;
      timeout = setTimeout(tick, 380 + Math.random() * 320);
    };
    tick();
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {lang === 'fr' ? 'v1.0 · accès anticipé' : 'v1.0 · early access'}
            </div>
            <h1 className="font-editorial text-[56px] md:text-[76px] leading-[0.95] tracking-tight text-balance">
              {lang === 'fr' ? (
                <>Concevoir, déployer<br />& <em className="italic font-light text-primary">monétiser</em><br />depuis l'Afrique.</>
              ) : (
                <>Design, deploy<br />& <em className="italic font-light text-primary">monetize</em><br />from Africa.</>
              )}
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted-foreground text-pretty">
              {lang === 'fr'
                ? 'Un système d\'exploitation cloud unifié pour les développeurs : du prompt au domaine, de la base de données au paiement Mobile Money — sans quitter NebulaOS.'
                : 'A unified cloud OS for developers: from prompt to domain, from database to Mobile Money payment — without ever leaving NebulaOS.'}
            </p>
            <div className="mt-10 flex items-center gap-6">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-5 py-3 bg-foreground text-background hover:bg-foreground/90 rounded-md text-[14px] font-medium transition"
              >
                {t.nav.start} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="text-[13px] text-muted-foreground hover:text-foreground transition border-b border-dashed border-muted-foreground/40 pb-0.5">
                {lang === 'fr' ? 'Voir comment ça fonctionne' : 'See how it works'}
              </a>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-8 wax-accent rounded-full blur-3xl -z-10" />
            <Terminal lines={streamed} streaming={streaming} prompt="akua@nebulaos:~/projects" height="h-[340px]" />
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>region: eu-west-2 · af-west-1</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> live</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-y-6 gap-x-10">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {lang === 'fr' ? 'Connecté nativement à' : 'Natively connected to'}
          </span>
          {['GitHub', 'Vercel', 'Stripe', 'MTN MoMo', 'Orange Money', 'Wave', 'Zoho Mail', 'Postgres'].map((b) => (
            <span key={b} className="font-mono text-[13px] text-muted-foreground/70">{b}</span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between gap-8 mb-14">
          <h2 className="font-editorial text-4xl md:text-5xl tracking-tight max-w-xl">
            {lang === 'fr' ? <>Quatre gestes. <em className="italic text-muted-foreground">Une seule plateforme.</em></> : <>Four moves. <em className="italic text-muted-foreground">One platform.</em></>}
          </h2>
          <p className="text-[13px] text-muted-foreground max-w-xs hidden md:block">
            {lang === 'fr' ? 'Du prompt à la production en quelques minutes — sans changer d\'outil, sans config DevOps.' : 'From prompt to production in minutes — no tool switching, no DevOps config.'}
          </p>
        </div>
        <div className="grid md:grid-cols-4 divide-x divide-border border-y border-border">
          {[
            { n: '01', label: lang === 'fr' ? 'Décris' : 'Describe', body: lang === 'fr' ? 'Un prompt suffit. NebulaOS scaffold le projet, choisit le stack, génère l\'UI.' : 'One prompt. NebulaOS scaffolds, picks the stack, generates the UI.' },
            { n: '02', label: lang === 'fr' ? 'Construis' : 'Build', body: lang === 'fr' ? 'Édite visuellement, ajoute des tables, écris des Edge Functions.' : 'Edit visually, add tables, write edge functions.' },
            { n: '03', label: lang === 'fr' ? 'Déploie' : 'Ship', body: lang === 'fr' ? 'Push vers GitHub. Deploy automatique, CDN mondial, rollback en 1 clic.' : 'Push to GitHub. Auto deploy, global CDN, one-click rollback.' },
            { n: '04', label: lang === 'fr' ? 'Encaisse' : 'Earn', body: lang === 'fr' ? 'Domaine, mail pro, wallet Mobile Money — facture tes clients localement.' : 'Domain, pro email, Mobile Money wallet — bill clients locally.' },
          ].map((s) => (
            <div key={s.n} className="px-6 py-8">
              <p className="font-mono text-[11px] text-muted-foreground tabular-nums">{s.n}</p>
              <p className="font-editorial text-2xl mt-3 mb-3">{s.label}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES — editorial split */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">{lang === 'fr' ? 'Les modules' : 'The modules'}</p>
        <h2 className="font-editorial text-4xl md:text-5xl tracking-tight max-w-3xl mb-20">
          {lang === 'fr' ? <>Neuf surfaces. Une <em className="italic text-primary">grammaire</em> commune.</> : <>Nine surfaces. One shared <em className="italic text-primary">grammar</em>.</>}
        </h2>

        <div className="space-y-24">
          {[
            { k: 'builder', n: '01', title: lang === 'fr' ? 'Project Builder' : 'Project Builder', body: lang === 'fr' ? 'Conversation, preview, code. Comme un éditeur — sans installation. Génère SaaS, marketplace, dashboard ou blog en quelques échanges.' : 'Chat, preview, code. Like an editor — no install. Generate SaaS, marketplaces, dashboards or blogs in a few turns.', preview: <BuilderPreview /> },
            { k: 'deploy', n: '02', title: lang === 'fr' ? 'Deployment' : 'Deployment', body: lang === 'fr' ? 'Pipeline visible, logs streamés, preview par branche, rollback en 1 clic. La rigueur de Vercel — sans la facture en USD.' : 'Visible pipeline, streamed logs, branch previews, one-click rollback. Vercel-grade — without the USD bill.', preview: <DeployPreview /> },
            { k: 'backend', n: '03', title: lang === 'fr' ? 'Backend & Database' : 'Backend & Database', body: lang === 'fr' ? 'Tables, RLS, auth, storage, edge functions. Un backend complet provisionné en secondes — comme Lovable Cloud, comme Render.' : 'Tables, RLS, auth, storage, edge functions. A complete backend provisioned in seconds — like Lovable Cloud, like Render.', preview: <BackendPreview /> },
            { k: 'billing', n: '04', title: lang === 'fr' ? 'Wallet & Mobile Money' : 'Wallet & Mobile Money', body: lang === 'fr' ? 'MTN, Orange, Wave, Moov et Stripe. Recharge, facture, paie ton infra en FCFA — sans carte bancaire internationale.' : 'MTN, Orange, Wave, Moov and Stripe. Top up, invoice, pay your infra in FCFA — no international card needed.', preview: <BillingPreview /> },
            { k: 'domain', n: '05', title: lang === 'fr' ? 'Domains & Email' : 'Domains & Email', body: lang === 'fr' ? '.africa, .ci, .sn, .com, .app — réservation, DNS et boîte mail Zoho prête en 60 secondes.' : '.africa, .ci, .sn, .com, .app — registration, DNS and Zoho mailbox ready in 60 seconds.', preview: <DomainPreview /> },
          ].map((m, i) => (
            <article key={m.k} className={`grid md:grid-cols-12 gap-10 items-center ${i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''}`}>
              <div className="md:col-span-5">
                <p className="font-mono text-[11px] text-muted-foreground tabular-nums mb-4">— {m.n}</p>
                <h3 className="font-editorial text-3xl md:text-4xl mb-5 tracking-tight">{m.title}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed text-pretty mb-6 max-w-md">{m.body}</p>
                <Link to="/dashboard" className="text-[13px] text-foreground hover:text-primary inline-flex items-center gap-1.5 border-b border-foreground/30 hover:border-primary pb-0.5 transition">
                  {lang === 'fr' ? 'Explorer' : 'Explore'} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="md:col-span-7">{m.preview}</div>
            </article>
          ))}
        </div>
      </section>

      {/* BUILT FOR AFRICA */}
      <section className="border-t border-border mt-32">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{lang === 'fr' ? 'Pensé sur place' : 'Built on the continent'}</p>
            <h2 className="font-editorial text-4xl md:text-5xl tracking-tight mb-6">
              {lang === 'fr' ? <>L'Afrique n'a pas besoin d'un <em className="italic text-primary">clone</em>. Elle mérite son propre OS.</> : <>Africa doesn't need a <em className="italic text-primary">clone</em>. It deserves its own OS.</>}
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed text-pretty max-w-md">
              {lang === 'fr' ? 'Latence basse depuis Abidjan, Lagos, Dakar et Nairobi. Tarification en FCFA. Mobile Money natif. Documentation bilingue. Conçu par des devs ouest-africains.' : 'Low latency from Abidjan, Lagos, Dakar and Nairobi. FCFA pricing. Native Mobile Money. Bilingual docs. Built by West-African developers.'}
            </p>
          </div>
          <AfricaMap />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12">
          <h2 className="font-editorial text-4xl md:text-5xl tracking-tight">{lang === 'fr' ? 'Tarifs' : 'Pricing'}</h2>
          <p className="text-[13px] text-muted-foreground max-w-xs">{t.pricing.desc}</p>
        </div>
        <PricingTable />
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <h2 className="font-editorial text-3xl md:text-4xl tracking-tight mb-10">{t.faq.title}</h2>
        <Accordion type="single" collapsible className="space-y-0">
          {[
            { q: t.faq.q1, a: t.faq.a1 },
            { q: t.faq.q2, a: t.faq.a2 },
            { q: t.faq.q3, a: t.faq.a3 },
            { q: t.faq.q4, a: t.faq.a4 },
          ].map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="border-b border-border first:border-t">
              <AccordionTrigger className="text-left py-5 hover:no-underline text-[15px] font-normal">{f.q}</AccordionTrigger>
              <AccordionContent className="text-[14px] text-muted-foreground leading-relaxed pb-6">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* MANIFESTO image */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
          <img
            src={heroImg}
            alt="NebulaOS visual manifesto, hand-printed bogolan and adinkra inspired composition"
            width={1024}
            height={1024}
            loading="lazy"
            className="w-full max-w-md mx-auto"
          />
          <p className="font-editorial italic text-2xl md:text-3xl leading-snug text-pretty">
            {lang === 'fr'
              ? '« Un développeur à Abidjan devrait pouvoir lancer un produit, encaisser et scaler — sans demander la permission à San Francisco. »'
              : '"A developer in Abidjan should be able to ship a product, get paid and scale — without asking permission to San Francisco."'}
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ============= Inline preview blocks ============= */

function BuilderPreview() {
  return (
    <div className="border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-border min-h-[260px]">
        <div className="p-4 space-y-3 text-[12px]">
          <div className="bg-muted/40 px-3 py-2 rounded-md">
            <p className="text-[10px] text-muted-foreground mb-1 font-mono">YOU</p>
            Build me a marketplace for Ankara fabric sellers with Mobile Money checkout.
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] text-muted-foreground mb-1 font-mono">NEBULA</p>
            <p className="text-foreground/90">Spinning up Next.js + Postgres + Stripe-MoMo. Generating /shop, /product, /checkout…</p>
            <div className="mt-2 flex gap-1">
              <span className="text-[10px] font-mono text-muted-foreground">writing</span>
              <span className="text-[10px] font-mono text-primary">app/checkout/momo.ts</span>
            </div>
          </div>
        </div>
        <div className="bg-[#0a0a0c] p-3">
          <div className="text-[10px] font-mono text-muted-foreground mb-2">preview · ankara-shop.nebula.app</div>
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded w-2/3" />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-gradient-to-br from-primary/40 to-accent/30 border border-border" />
              ))}
            </div>
            <div className="h-2 bg-muted rounded w-1/2 mt-3" />
            <div className="h-6 bg-primary/80 rounded w-24 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeployPreview() {
  return (
    <div className="border border-border bg-surface">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="font-mono text-[12px]">kente-shop-a8f2.nebula.app</span>
        <span className="text-[11px] text-muted-foreground ml-auto">Ready · 28.3s</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4 text-[12px] space-y-2.5">
          {[
            ['Queued', '0.4s', 'success'],
            ['Cloning', '1.2s', 'success'],
            ['Installing', '8.1s', 'success'],
            ['Building', '14.6s', 'success'],
            ['Deploying', '4.0s', 'active'],
          ].map(([l, d, s]) => (
            <div key={l} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${s === 'success' ? 'bg-success' : 'bg-primary animate-pulse'}`} />
              <span className="flex-1">{l}</span>
              <span className="font-mono text-muted-foreground tabular-nums">{d}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#0a0a0c] p-3 font-mono text-[11px] leading-relaxed">
          <div className="text-muted-foreground">12:42:18 ✓ Compiled</div>
          <div className="text-muted-foreground">12:42:19 Optimizing assets…</div>
          <div className="text-muted-foreground">12:42:21 Uploading to CDN (12 regions)</div>
          <div className="text-success">12:42:25 ✓ Deployment ready</div>
        </div>
      </div>
    </div>
  );
}

function BackendPreview() {
  return (
    <div className="border border-border bg-surface">
      <div className="border-b border-border px-3 py-2 flex items-center gap-3 text-[12px]">
        <span className="text-foreground">Database</span>
        <span className="text-muted-foreground">Auth</span>
        <span className="text-muted-foreground">Storage</span>
        <span className="text-muted-foreground">Functions</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">db_a8f2 · eu-west-2</span>
      </div>
      <table className="w-full text-[12px] font-mono">
        <thead className="text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left px-3 py-2 font-normal">id</th>
            <th className="text-left px-3 py-2 font-normal">name</th>
            <th className="text-left px-3 py-2 font-normal">price_xof</th>
            <th className="text-left px-3 py-2 font-normal">created_at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[
            ['p_001', 'Pagne kente royal', '12 500', '2026-04-12'],
            ['p_002', 'Boubou indigo Bamako', '24 000', '2026-04-11'],
            ['p_003', 'Bogolan tissé main', '18 750', '2026-04-09'],
          ].map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className="px-3 py-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillingPreview() {
  return (
    <div className="border border-border bg-surface p-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Solde wallet</p>
      <p className="font-editorial text-4xl mt-1 num">12 700 <span className="text-base text-muted-foreground">FCFA</span></p>
      <div className="mt-5 space-y-2">
        {[
          { p: 'MTN MoMo', a: '+10 000 FCFA', t: 'il y a 2h', tone: 'bg-[#FFCC00] text-black' },
          { p: 'Orange Money', a: '+5 000 FCFA', t: 'hier', tone: 'bg-[#FF7900] text-white' },
          { p: 'Wave', a: '−1 500 FCFA', t: 'il y a 3j', tone: 'bg-[#1DC8E1] text-black' },
        ].map((tx) => (
          <div key={tx.p} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-[12px]">
            <span className={`px-1.5 py-0.5 text-[10px] font-mono ${tx.tone}`}>{tx.p}</span>
            <span className="flex-1 text-muted-foreground">{tx.t}</span>
            <span className="font-mono num">{tx.a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DomainPreview() {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex items-center gap-2 border border-border px-3 py-2 mb-4">
        <span className="font-mono text-[12px] text-muted-foreground">›</span>
        <span className="font-mono text-[13px]">ankara-shop</span>
      </div>
      {[
        { tld: '.com', price: '5 900', status: 'taken' },
        { tld: '.app', price: '12 000', status: 'available' },
        { tld: '.africa', price: '15 500', status: 'available' },
        { tld: '.ci', price: '32 000', status: 'available' },
      ].map((d) => (
        <div key={d.tld} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-[12px]">
          <span className="font-mono">ankara-shop<span className="text-primary">{d.tld}</span></span>
          <span className="font-mono text-muted-foreground ml-auto">{d.price} FCFA/an</span>
          <span className={`text-[10px] uppercase tracking-wide ${d.status === 'available' ? 'text-success' : 'text-muted-foreground/60'}`}>{d.status}</span>
        </div>
      ))}
    </div>
  );
}

function AfricaMap() {
  const dots = [
    { x: 38, y: 56, name: 'Abidjan' },
    { x: 49, y: 58, name: 'Lagos' },
    { x: 32, y: 47, name: 'Dakar' },
    { x: 70, y: 64, name: 'Nairobi' },
    { x: 56, y: 68, name: 'Kinshasa' },
    { x: 60, y: 28, name: 'Cairo' },
  ];
  return (
    <div className="relative aspect-[4/5] max-w-md mx-auto">
      <svg viewBox="0 0 100 120" className="w-full h-full text-border" fill="none" stroke="currentColor" strokeWidth="0.4">
        {/* simplified Africa silhouette */}
        <path d="M40 8 L60 8 L70 18 L78 30 L82 45 L82 60 L78 75 L70 90 L60 105 L50 110 L40 105 L32 95 L26 80 L22 65 L20 50 L22 35 L28 22 Z" />
      </svg>
      {dots.map((d) => (
        <div key={d.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-primary opacity-50 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{d.name}</span>
        </div>
      ))}
    </div>
  );
}

function PricingTable() {
  const { lang } = useI18n();
  const [currency, setCurrency] = useState<'FCFA' | 'USD'>('FCFA');
  const rows: Array<{ feat: string; v: (string | boolean)[] }> = [
    { feat: lang === 'fr' ? 'Projets' : 'Projects', v: ['1', '5', 'Illimité', 'Illimité'] },
    { feat: lang === 'fr' ? 'Bande passante' : 'Bandwidth', v: ['10 GB', '100 GB', '1 TB', 'Custom'] },
    { feat: lang === 'fr' ? 'Build minutes' : 'Build minutes', v: ['200', '2 000', '20 000', 'Custom'] },
    { feat: 'Postgres', v: ['256 MB', '1 GB', '10 GB', 'Dédié'] },
    { feat: 'Edge functions', v: [true, true, true, true] },
    { feat: 'Mobile Money', v: [true, true, true, true] },
    { feat: lang === 'fr' ? 'Domaines inclus' : 'Domains included', v: ['—', '1', '3', 'Custom'] },
    { feat: lang === 'fr' ? 'Support' : 'Support', v: ['Community', 'Email', 'Priority', 'Dedicated SLA'] },
  ];
  const plans = [
    { name: 'Free', price: { FCFA: '0', USD: '0' }, cta: lang === 'fr' ? 'Commencer' : 'Start' },
    { name: 'Starter', price: { FCFA: '2 000', USD: '4' }, cta: lang === 'fr' ? 'Choisir' : 'Choose', highlighted: true },
    { name: 'Pro', price: { FCFA: '10 000', USD: '20' }, cta: lang === 'fr' ? 'Choisir' : 'Choose' },
    { name: 'Enterprise', price: { FCFA: 'Sur mesure', USD: 'Custom' }, cta: 'Contact' },
  ];

  return (
    <div className="border border-border">
      <div className="flex items-center justify-end px-5 py-3 border-b border-border">
        <div className="inline-flex border border-border text-[11px] font-mono">
          {(['FCFA', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1 transition ${currency === c ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-5 w-[28%]"></th>
            {plans.map((p) => (
              <th key={p.name} className={`text-left p-5 align-bottom ${p.highlighted ? 'bg-primary/5' : ''}`}>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">{p.name}</p>
                <p className="font-editorial text-3xl num">
                  {p.price[currency]}
                  {!['Sur mesure', 'Custom'].includes(p.price[currency]) && (
                    <span className="text-xs text-muted-foreground ml-1">{currency}/mo</span>
                  )}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feat} className="border-b border-border last:border-0">
              <td className="p-4 text-[13px] text-muted-foreground">{r.feat}</td>
              {r.v.map((val, i) => (
                <td key={i} className={`p-4 text-[13px] ${plans[i].highlighted ? 'bg-primary/5' : ''}`}>
                  {typeof val === 'boolean' ? (
                    val ? <Check className="h-4 w-4 text-success" /> : <Minus className="h-4 w-4 text-muted-foreground/50" />
                  ) : (
                    <span className="font-mono num">{val}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-5"></td>
            {plans.map((p) => (
              <td key={p.name} className={`p-5 ${p.highlighted ? 'bg-primary/5' : ''}`}>
                <Link
                  to="/auth"
                  className={`inline-flex items-center justify-center px-3 py-1.5 text-[12px] rounded-md transition ${p.highlighted ? 'bg-foreground text-background hover:bg-foreground/90' : 'border border-border hover:border-foreground'}`}
                >
                  {p.cta} →
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
