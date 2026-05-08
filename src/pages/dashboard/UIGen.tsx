import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Eye, Code2, Layers } from 'lucide-react';

const presets = [
  { k: 'component', label: 'Component', desc: 'Hero, pricing card, table, navbar…' },
  { k: 'page', label: 'Full page', desc: 'Landing, dashboard, settings…' },
  { k: 'edit', label: 'Edit existing', desc: 'Refine a screen with natural language' },
];

export default function UIGen() {
  const { lang } = useI18n();
  const [mode, setMode] = useState('page');
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">UI Generation</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          {lang === 'fr' ? <>Décrivez. <em className="italic text-muted-foreground">Voyez apparaître.</em></> : <>Describe. <em className="italic text-muted-foreground">Watch it appear.</em></>}
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
        {presets.map((p) => (
          <button
            key={p.k}
            onClick={() => setMode(p.k)}
            className={`p-5 text-left bg-background transition ${mode === p.k ? 'ring-1 ring-primary -ring-offset-1' : 'hover:bg-muted/30'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {p.k === 'component' && <Layers className="h-4 w-4 text-primary" />}
              {p.k === 'page' && <Eye className="h-4 w-4 text-primary" />}
              {p.k === 'edit' && <Wand2 className="h-4 w-4 text-primary" />}
              <p className="font-mono text-[13px]">{p.label}</p>
            </div>
            <p className="text-[12px] text-muted-foreground">{p.desc}</p>
          </button>
        ))}
      </div>

      <div className="border border-border p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={lang === 'fr' ? 'Une page de pricing en 3 colonnes avec accent ocre, typo serif éditoriale, tableau comparatif dense…' : 'A 3-column pricing page with ochre accent, editorial serif typography, dense comparison table…'}
          className="w-full bg-transparent outline-none resize-none text-[14px] placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-mono text-muted-foreground">{mode}</span>
          <Button onClick={() => setGenerated(true)} disabled={!prompt} className="ml-auto gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> {lang === 'fr' ? 'Générer' : 'Generate'}
          </Button>
        </div>
      </div>

      {generated && (
        <div className="border border-border">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground">PREVIEW · variation 1/3</span>
            <button className="ml-auto text-[11px] font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Code2 className="h-3 w-3" /> view code</button>
          </div>
          <div className="p-10 grid md:grid-cols-3 gap-px bg-border">
            {[
              { name: 'Free', price: '0' },
              { name: 'Starter', price: '2 000', highlighted: true },
              { name: 'Pro', price: '10 000' },
            ].map((p) => (
              <div key={p.name} className={`p-6 bg-background ${p.highlighted ? 'bg-primary/5' : ''}`}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.name}</p>
                <p className="font-editorial text-3xl mt-2 num">{p.price} <span className="text-xs text-muted-foreground">FCFA/mo</span></p>
                <ul className="mt-4 space-y-1.5 text-[12px] text-muted-foreground">
                  <li>· Unlimited deploys</li>
                  <li>· Postgres included</li>
                  <li>· Mobile Money</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
