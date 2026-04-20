import { create } from 'zustand';

export type Lang = 'fr' | 'en';

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('nebula-lang')) as Lang | null;

export const useI18n = create<I18nState>((set) => ({
  lang: stored || 'fr',
  setLang: (l) => {
    localStorage.setItem('nebula-lang', l);
    set({ lang: l });
  },
}));

export const dict = {
  fr: {
    nav: { features: 'Modules', pricing: 'Tarifs', docs: 'Docs', login: 'Connexion', start: 'Commencer' },
    hero: {
      badge: '🌍 Conçu en Afrique, pensé pour le monde',
      title: 'Build, deploy, scale.',
      subtitle: 'Depuis un seul endroit.',
      desc: 'NebulaOS unifie design, code, hosting, base de données, domaine et email. Zéro config. Coût accessible. Conçu pour les devs africains.',
      cta: 'Commencer gratuitement',
      cta2: 'Voir la démo',
    },
    modules: {
      title: '9 modules. Une seule plateforme.',
      desc: 'Tout ce qu\'il faut pour passer de l\'idée à la prod.',
      builder: { name: 'Project Builder', desc: 'Génère ton projet depuis un prompt' },
      ui: { name: 'UI Generation', desc: 'Crée tes interfaces visuellement' },
      backend: { name: 'Backend Builder', desc: 'API, auth, base de données auto' },
      deploy: { name: 'Deployment', desc: 'Déploiement 1-clic mondial' },
      domain: { name: 'Domain Management', desc: 'Achat & DNS automatiques' },
      email: { name: 'Email Setup', desc: 'Email pro instantané' },
      cicd: { name: 'CI/CD', desc: 'Auto-deploy sur push GitHub' },
      monitoring: { name: 'Monitoring', desc: 'Logs, erreurs, uptime' },
      billing: { name: 'Billing & Wallet', desc: 'Mobile Money + Stripe' },
    },
    compare: {
      title: 'Avant vs Après NebulaOS',
      before: 'Avant',
      after: 'Après',
      beforeItems: ['7 abonnements différents', '~150€/mois cumulés', 'DevOps complexe', 'Pas de Mobile Money', 'Heures de config DNS'],
      afterItems: ['1 seule plateforme', 'À partir de 2000 FCFA/mois', 'Zéro DevOps', 'MTN & Orange Money', 'DNS auto en 30s'],
    },
    pricing: {
      title: 'Tarifs accessibles',
      desc: 'Pensés pour les devs africains. Pay-per-use disponible.',
      monthly: 'Mensuel',
      free: { name: 'Free', price: '0', desc: '1 projet, idéal pour tester' },
      starter: { name: 'Starter', price: '2 000', desc: 'Projets perso & MVP', popular: 'Populaire' },
      pro: { name: 'Pro', price: '10 000', desc: 'Freelances & startups' },
      enterprise: { name: 'Enterprise', price: 'Sur mesure', desc: 'Équipes & scale' },
      cta: 'Choisir',
    },
    testimonials: { title: 'Ils construisent avec NebulaOS' },
    faq: {
      title: 'Questions fréquentes',
      q1: 'Puis-je payer en Mobile Money ?', a1: 'Oui — MTN Mobile Money et Orange Money sont supportés nativement, ainsi que Stripe pour l\'international.',
      q2: 'Mes projets m\'appartiennent ?', a2: 'À 100%. Tu peux exporter le code source à tout moment, aucun lock-in.',
      q3: 'Faut-il connaître le DevOps ?', a3: 'Non. NebulaOS orchestre tout pour toi : Vercel, Supabase, Namecheap, GitHub Actions...',
      q4: 'Y a-t-il un plan gratuit ?', a4: 'Oui, le plan Free permet de déployer 1 projet et de tester toutes les fonctionnalités.',
    },
    footer: { product: 'Produit', company: 'Entreprise', legal: 'Légal', rights: 'Tous droits réservés.' },
    auth: {
      welcome: 'Bienvenue', subtitle: 'Connecte-toi pour continuer',
      welcomeNew: 'Crée ton compte', subtitleNew: 'Commence à construire en 30s',
      email: 'Email', password: 'Mot de passe', name: 'Nom complet',
      login: 'Se connecter', signup: 'Créer un compte',
      orContinue: 'Ou continue avec', noAccount: 'Pas de compte ?', hasAccount: 'Déjà inscrit ?',
      createOne: 'Crée-le', loginNow: 'Connecte-toi',
    },
    dash: {
      title: 'Tableau de bord', greeting: 'Bonjour', newProject: 'Nouveau projet',
      recent: 'Projets récents', activity: 'Activité récente', wallet: 'Wallet', alerts: 'Alertes',
      stats: { projects: 'Projets', deploys: 'Déploiements', domains: 'Domaines', uptime: 'Uptime' },
    },
    common: {
      search: 'Rechercher', save: 'Enregistrer', cancel: 'Annuler', confirm: 'Confirmer',
      next: 'Suivant', back: 'Retour', deploy: 'Déployer', loading: 'Chargement...',
      success: 'Succès', error: 'Erreur', balance: 'Solde', recharge: 'Recharger',
    },
  },
  en: {
    nav: { features: 'Modules', pricing: 'Pricing', docs: 'Docs', login: 'Sign in', start: 'Get started' },
    hero: {
      badge: '🌍 Built in Africa, made for the world',
      title: 'Build, deploy, scale.',
      subtitle: 'From a single place.',
      desc: 'NebulaOS unifies design, code, hosting, database, domain and email. Zero config. Affordable cost. Made for African devs.',
      cta: 'Start for free',
      cta2: 'Watch demo',
    },
    modules: {
      title: '9 modules. One platform.',
      desc: 'Everything you need to go from idea to production.',
      builder: { name: 'Project Builder', desc: 'Generate projects from a prompt' },
      ui: { name: 'UI Generation', desc: 'Build interfaces visually' },
      backend: { name: 'Backend Builder', desc: 'API, auth, database — auto' },
      deploy: { name: 'Deployment', desc: 'One-click global deploy' },
      domain: { name: 'Domain Management', desc: 'Auto purchase & DNS' },
      email: { name: 'Email Setup', desc: 'Instant pro email' },
      cicd: { name: 'CI/CD', desc: 'Auto deploy on GitHub push' },
      monitoring: { name: 'Monitoring', desc: 'Logs, errors, uptime' },
      billing: { name: 'Billing & Wallet', desc: 'Mobile Money + Stripe' },
    },
    compare: {
      title: 'Before vs After NebulaOS',
      before: 'Before', after: 'After',
      beforeItems: ['7 different subscriptions', '~$150/month combined', 'Complex DevOps', 'No Mobile Money', 'Hours of DNS config'],
      afterItems: ['One single platform', 'From $4/month', 'Zero DevOps', 'MTN & Orange Money', 'Auto DNS in 30s'],
    },
    pricing: {
      title: 'Affordable pricing',
      desc: 'Designed for African devs. Pay-per-use available.',
      monthly: 'Monthly',
      free: { name: 'Free', price: '0', desc: '1 project, perfect to test' },
      starter: { name: 'Starter', price: '4', desc: 'Personal projects & MVPs', popular: 'Popular' },
      pro: { name: 'Pro', price: '20', desc: 'Freelancers & startups' },
      enterprise: { name: 'Enterprise', price: 'Custom', desc: 'Teams & scale' },
      cta: 'Choose',
    },
    testimonials: { title: 'They build with NebulaOS' },
    faq: {
      title: 'Frequently asked',
      q1: 'Can I pay with Mobile Money?', a1: 'Yes — MTN Mobile Money and Orange Money are natively supported, plus Stripe for international.',
      q2: 'Do I own my projects?', a2: '100%. You can export source code anytime — no lock-in.',
      q3: 'Do I need DevOps skills?', a3: 'No. NebulaOS orchestrates everything: Vercel, Supabase, Namecheap, GitHub Actions...',
      q4: 'Is there a free plan?', a4: 'Yes, the Free plan lets you deploy 1 project and test all features.',
    },
    footer: { product: 'Product', company: 'Company', legal: 'Legal', rights: 'All rights reserved.' },
    auth: {
      welcome: 'Welcome back', subtitle: 'Sign in to continue',
      welcomeNew: 'Create your account', subtitleNew: 'Start building in 30s',
      email: 'Email', password: 'Password', name: 'Full name',
      login: 'Sign in', signup: 'Sign up',
      orContinue: 'Or continue with', noAccount: 'No account?', hasAccount: 'Already registered?',
      createOne: 'Create one', loginNow: 'Sign in',
    },
    dash: {
      title: 'Dashboard', greeting: 'Hello', newProject: 'New project',
      recent: 'Recent projects', activity: 'Recent activity', wallet: 'Wallet', alerts: 'Alerts',
      stats: { projects: 'Projects', deploys: 'Deployments', domains: 'Domains', uptime: 'Uptime' },
    },
    common: {
      search: 'Search', save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
      next: 'Next', back: 'Back', deploy: 'Deploy', loading: 'Loading...',
      success: 'Success', error: 'Error', balance: 'Balance', recharge: 'Top up',
    },
  },
} as const;

export const useT = () => {
  const lang = useI18n((s) => s.lang);
  return dict[lang];
};
