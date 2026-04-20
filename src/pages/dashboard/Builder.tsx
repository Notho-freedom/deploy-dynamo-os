import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { Sparkles, ShoppingCart, FileText, BarChart3, Code, Wand2, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const templates = [
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart, desc: 'Boutique en ligne avec paiement', stack: 'Next.js + Stripe' },
  { id: 'blog', name: 'Blog / CMS', icon: FileText, desc: 'Site éditorial avec admin', stack: 'Next.js + MDX' },
  { id: 'saas', name: 'SaaS Dashboard', icon: BarChart3, desc: 'Application multi-tenant', stack: 'React + Supabase' },
  { id: 'api', name: 'REST API', icon: Code, desc: 'Backend pur sans UI', stack: 'Node + Express' },
  { id: 'marketplace', name: 'Marketplace', icon: ShoppingCart, desc: 'Plateforme multi-vendeurs', stack: 'Next.js + Stripe Connect' },
  { id: 'landing', name: 'Landing Page', icon: Sparkles, desc: 'Page de capture marketing', stack: 'React + Tailwind' },
];

const Builder = () => {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState(0); // 0 prompt, 1 template, 2 config, 3 done
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [framework, setFramework] = useState<'nextjs' | 'react'>('nextjs');
  const [generating, setGenerating] = useState(false);
  const addProject = useApp((s) => s.addProject);

  const handleGenerate = () => {
    if (!prompt) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setStep(1);
      // Auto-suggest template based on prompt
      const lower = prompt.toLowerCase();
      if (lower.includes('shop') || lower.includes('boutique')) setSelected('ecommerce');
      else if (lower.includes('blog')) setSelected('blog');
      else if (lower.includes('saas')) setSelected('saas');
    }, 1500);
  };

  const handleCreate = () => {
    setGenerating(true);
    setTimeout(() => {
      const p = addProject({ name: name || 'untitled-project', framework, template: selected || 'blank', status: 'draft' });
      setGenerating(false);
      setStep(3);
      toast({ title: '🎉 Project created', description: p.name });
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Project Builder</h1>
        <p className="text-muted-foreground">Décris ton idée — on génère la structure.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {['Idea', 'Template', 'Config', 'Done'].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-mono ${step >= i ? 'gradient-cosmic text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={step >= i ? 'font-medium' : 'text-muted-foreground'}>{s}</span>
            {i < 3 && <span className="text-muted-foreground mx-2">→</span>}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="glass p-8">
          <Wand2 className="h-8 w-8 text-primary mb-4" />
          <h2 className="font-display text-xl font-semibold mb-3">What do you want to build?</h2>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Crée un SaaS pour vendre des cours en ligne, avec abonnement mensuel et paiement Mobile Money..."
            className="min-h-32 mb-4 font-mono text-sm"
          />
          <Button onClick={handleGenerate} disabled={!prompt || generating} className="gradient-cosmic glow">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate</>}
          </Button>
        </Card>
      )}

      {step === 1 && (
        <Card className="glass p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Pick a template</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelected(tpl.id)}
                className={`p-4 rounded-lg border text-left transition ${selected === tpl.id ? 'border-primary glow bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <tpl.icon className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold mb-1">{tpl.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{tpl.desc}</p>
                <Badge variant="outline" className="text-xs font-mono">{tpl.stack}</Badge>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)} disabled={!selected} className="gradient-cosmic">Next</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass p-6 max-w-xl">
          <h2 className="font-display text-xl font-semibold mb-4">Configure</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Project name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-awesome-app" className="font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Framework</label>
              <div className="flex gap-2">
                {(['nextjs', 'react'] as const).map((f) => (
                  <button key={f} onClick={() => setFramework(f)} className={`px-4 py-2 rounded-lg border text-sm font-mono ${framework === f ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleCreate} disabled={generating || !name} className="gradient-cosmic glow">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create project'}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="glass p-8 text-center glow">
          <div className="h-16 w-16 rounded-full gradient-cosmic mx-auto flex items-center justify-center mb-4 animate-pulse-glow">
            <Check className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Project ready!</h2>
          <p className="text-muted-foreground mb-6">Your scaffolded project <span className="font-mono text-foreground">{name}</span> is ready.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { setStep(0); setPrompt(''); setName(''); setSelected(null); }}>New project</Button>
            <Button className="gradient-cosmic glow">Open in editor</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Builder;
