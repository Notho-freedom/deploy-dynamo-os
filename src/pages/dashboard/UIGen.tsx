import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Image as ImageIcon, Type, Square, MousePointer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const UIGen = () => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    if (!prompt) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      toast({ title: '✨ UI generated' });
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">UI Generation</h1>
        <p className="text-muted-foreground">Génère des écrans à partir d'un prompt ou d'une image.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input */}
        <Card className="glass p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Une page de pricing avec 3 plans, style afro-futuriste"
              className="min-h-32 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Or import image</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground hover:border-primary cursor-pointer transition">
              Drop screenshot or design here
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={!prompt || generating} className="w-full gradient-cosmic glow">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : 'Generate UI'}
          </Button>

          {generated && (
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Edit tools</p>
              <div className="grid grid-cols-4 gap-2">
                {[MousePointer, Type, Square, ImageIcon].map((Icon, i) => (
                  <button key={i} className="aspect-square rounded-lg border border-border hover:border-primary flex items-center justify-center transition">
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Preview */}
        <Card className="glass p-6 lg:col-span-2 min-h-[500px]">
          <div className="text-xs font-mono text-muted-foreground mb-3">Preview</div>
          {!generated && !generating && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Your generated UI will appear here
            </div>
          )}
          {generating && (
            <div className="h-full flex items-center justify-center">
              <div className="space-y-3 w-full max-w-md">
                <div className="h-8 rounded animate-shimmer bg-muted" />
                <div className="h-32 rounded animate-shimmer bg-muted" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-24 rounded animate-shimmer bg-muted" />
                  <div className="h-24 rounded animate-shimmer bg-muted" />
                  <div className="h-24 rounded animate-shimmer bg-muted" />
                </div>
              </div>
            </div>
          )}
          {generated && (
            <div className="rounded-lg border border-border p-6 space-y-6 bg-background/50">
              <div className="text-center">
                <h3 className="font-display text-2xl font-bold text-gradient-cosmic mb-2">Pricing</h3>
                <p className="text-sm text-muted-foreground">Choose your plan</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Free', 'Pro', 'Enterprise'].map((p, i) => (
                  <div key={p} className={`p-4 rounded-lg border ${i === 1 ? 'border-primary glow' : 'border-border'}`}>
                    <p className="font-semibold">{p}</p>
                    <p className="font-display text-xl font-bold mt-2">${i * 19}</p>
                    <Button size="sm" className={`w-full mt-3 ${i === 1 ? 'gradient-cosmic' : ''}`} variant={i === 1 ? 'default' : 'outline'}>Choose</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default UIGen;
