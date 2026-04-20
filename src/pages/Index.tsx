import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Layout, Database, Rocket, Globe, Mail, GitBranch, Activity, Wallet,
  Check, X, ArrowRight, Star,
} from 'lucide-react';
import { useState } from 'react';

const Index = () => {
  const t = useT();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<'XOF' | 'USD'>('XOF');

  const moduleCards = [
    { icon: Sparkles, ...t.modules.builder, color: 'from-primary to-secondary' },
    { icon: Layout, ...t.modules.ui, color: 'from-secondary to-gold' },
    { icon: Database, ...t.modules.backend, color: 'from-accent to-primary' },
    { icon: Rocket, ...t.modules.deploy, color: 'from-primary to-accent' },
    { icon: Globe, ...t.modules.domain, color: 'from-gold to-secondary' },
    { icon: Mail, ...t.modules.email, color: 'from-accent to-gold' },
    { icon: GitBranch, ...t.modules.cicd, color: 'from-secondary to-primary' },
    { icon: Activity, ...t.modules.monitoring, color: 'from-primary to-gold' },
    { icon: Wallet, ...t.modules.billing, color: 'from-gold to-accent' },
  ];

  const plans: Array<{ name: string; price: string; desc: string; features: string[]; highlighted?: boolean; popular?: string }> = [
    { ...t.pricing.free, features: ['1 projet', 'Subdomain nebula.app', 'Community support'] },
    { ...t.pricing.starter, features: ['5 projets', 'Custom domain', 'Email pro', 'Mobile Money'], highlighted: true },
    { ...t.pricing.pro, features: ['Projets illimités', 'CI/CD avancé', 'Monitoring complet', 'Priority support'] },
    { ...t.pricing.enterprise, features: ['SSO', 'SLA 99.99%', 'Account manager', 'On-premise option'] },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background cosmique */}
      <div className="fixed inset-0 -z-10 wax-pattern" />
      <div className="fixed inset-0 -z-10 stars-bg opacity-40" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] -z-10 rounded-full bg-primary/20 blur-[120px]" />
      <div className="fixed top-1/3 right-0 w-[500px] h-[500px] -z-10 rounded-full bg-secondary/20 blur-[120px]" />

      <SiteHeader />

      {/* HERO */}
      <section className="container pt-20 pb-32 text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 animate-fade-in">
          <span className="text-sm font-medium">{t.hero.badge}</span>
        </div>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight animate-fade-in">
          <span className="text-gradient-aurora">{t.hero.title}</span>
          <br />
          <span className="text-foreground/90">{t.hero.subtitle}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in">
          {t.hero.desc}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="gradient-cosmic glow text-base h-12 px-8">
            {t.hero.cta} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')} className="text-base h-12 px-8">
            {t.hero.cta2}
          </Button>
        </div>

        {/* Social proof */}
        <div className="mt-20 opacity-60">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Trusted by builders across Africa</p>
          <div className="flex flex-wrap justify-center gap-8 font-display text-lg font-semibold">
            <span>Andela</span><span>Flutterwave</span><span>Paystack</span><span>Yango</span><span>Wave</span><span>Jumia</span>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="container py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">{t.modules.title}</h2>
          <p className="text-lg text-muted-foreground">{t.modules.desc}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleCards.map((m, i) => (
            <Card
              key={i}
              className="glass p-6 hover:scale-[1.02] hover:glow transition-all cursor-pointer group relative overflow-hidden"
              onClick={() => navigate('/dashboard')}
            >
              <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${m.color} opacity-10 group-hover:opacity-20 transition`} />
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-4 glow`}>
                <m.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{m.name}</h3>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* COMPARE */}
      <section className="container py-24">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16">{t.compare.title}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="glass p-8 border-destructive/30">
            <div className="flex items-center gap-2 mb-6">
              <X className="h-5 w-5 text-destructive" />
              <h3 className="font-display text-2xl font-semibold">{t.compare.before}</h3>
            </div>
            <ul className="space-y-3">
              {t.compare.beforeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <X className="h-4 w-4 text-destructive mt-1 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="glass p-8 border-primary/40 glow">
            <div className="flex items-center gap-2 mb-6">
              <Check className="h-5 w-5 text-accent" />
              <h3 className="font-display text-2xl font-semibold text-gradient-cosmic">{t.compare.after}</h3>
            </div>
            <ul className="space-y-3">
              {t.compare.afterItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent mt-1 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">{t.pricing.title}</h2>
          <p className="text-lg text-muted-foreground mb-8">{t.pricing.desc}</p>
          <div className="inline-flex glass rounded-full p-1">
            <button onClick={() => setBilling('XOF')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${billing === 'XOF' ? 'gradient-cosmic text-primary-foreground' : 'text-muted-foreground'}`}>FCFA</button>
            <button onClick={() => setBilling('USD')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${billing === 'USD' ? 'gradient-cosmic text-primary-foreground' : 'text-muted-foreground'}`}>USD</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p, i) => (
            <Card key={i} className={`glass p-6 relative ${p.highlighted ? 'border-primary glow' : ''}`}>
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-gold text-xs font-semibold text-gold-foreground">
                  ⭐ {(p as any).popular}
                </span>
              )}
              <h3 className="font-display text-xl font-semibold mb-2">{p.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-display font-bold">
                  {p.price === '0' ? '0' : p.price === 'Sur mesure' || p.price === 'Custom' ? p.price : (billing === 'XOF' ? p.price : (parseInt(p.price.replace(/\s/g, '')) / 600).toFixed(0))}
                </span>
                {p.price !== '0' && p.price !== 'Sur mesure' && p.price !== 'Custom' && (
                  <span className="text-muted-foreground text-sm ml-1">{billing === 'XOF' ? 'FCFA' : '$'}/mo</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-6">{p.desc}</p>
              <ul className="space-y-2 mb-6">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate('/auth?mode=signup')}
                className={`w-full ${p.highlighted ? 'gradient-cosmic glow' : ''}`}
                variant={p.highlighted ? 'default' : 'outline'}
              >
                {t.pricing.cta}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-24">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16">{t.testimonials.title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Akua Mensah', role: 'Founder, KenteShop', city: 'Accra 🇬🇭', quote: 'J\'ai déployé ma boutique en 1h, dimanche. Mobile Money a tout changé pour moi.' },
            { name: 'Tunde Adebayo', role: 'CTO, LagosRides', city: 'Lagos 🇳🇬', quote: 'NebulaOS replaces 6 tools. Our infra cost dropped by 70%.' },
            { name: 'Fatou Diop', role: 'Indie dev', city: 'Dakar 🇸🇳', quote: 'Enfin une plateforme qui pense aux devs africains. Le support FR est top.' },
          ].map((t, i) => (
            <Card key={i} className="glass p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-gold text-gold" />)}
              </div>
              <p className="mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-cosmic flex items-center justify-center font-display font-semibold text-primary-foreground">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role} · {t.city}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-24 max-w-3xl">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">{t.faq.title}</h2>
        <Accordion type="single" collapsible className="glass rounded-2xl px-6">
          {[1, 2, 3, 4].map((n) => (
            <AccordionItem key={n} value={`q${n}`} className="border-border/50">
              <AccordionTrigger className="font-display text-left">{(t.faq as any)[`q${n}`]}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{(t.faq as any)[`a${n}`]}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA final */}
      <section className="container py-24">
        <Card className="glass p-12 text-center relative overflow-hidden glow">
          <div className="absolute inset-0 gradient-nebula opacity-30" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-aurora">Ready to build?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">Join thousands of African devs shipping faster.</p>
            <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="gradient-cosmic glow h-12 px-8">
              {t.hero.cta} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
