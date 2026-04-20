import { create } from 'zustand';

// Structures alignées sur les vraies APIs (Vercel, GitHub, Namecheap, Stripe...)
export interface Project {
  id: string;
  name: string;
  framework: 'nextjs' | 'react' | 'vue' | 'svelte';
  template: string;
  createdAt: string;
  status: 'draft' | 'building' | 'ready' | 'error';
  url?: string;
  repo?: string;
}

export interface Deployment {
  uid: string;
  projectId: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  duration?: number;
  commit?: string;
}

export interface Domain {
  name: string;
  status: 'active' | 'pending' | 'expired';
  expiresAt: string;
  projectId?: string;
  autoRenew: boolean;
  registrar: 'namecheap' | 'planethoster';
}

export interface WalletTx {
  id: string;
  type: 'topup' | 'usage' | 'refund';
  amount: number; // FCFA
  currency: 'XOF' | 'USD';
  method?: 'mtn' | 'orange' | 'stripe' | 'wave';
  description: string;
  status: 'succeeded' | 'pending' | 'failed';
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
}

interface AppState {
  user: User | null;
  projects: Project[];
  deployments: Deployment[];
  domains: Domain[];
  wallet: { balanceFcfa: number; balanceUsd: number; txs: WalletTx[] };

  login: (email: string) => void;
  logout: () => void;
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  addDeployment: (d: Omit<Deployment, 'uid' | 'createdAt'>) => Deployment;
  updateDeployment: (uid: string, patch: Partial<Deployment>) => void;
  addDomain: (d: Domain) => void;
  addWalletTx: (t: Omit<WalletTx, 'id' | 'createdAt'>) => void;
}

const seedProjects: Project[] = [
  { id: 'p1', name: 'kente-shop', framework: 'nextjs', template: 'ecommerce', createdAt: '2026-04-12', status: 'ready', url: 'https://kente-shop.nebula.app', repo: 'akua/kente-shop' },
  { id: 'p2', name: 'lagos-rides', framework: 'react', template: 'marketplace', createdAt: '2026-04-08', status: 'ready', url: 'https://lagos-rides.nebula.app', repo: 'tunde/lagos-rides' },
  { id: 'p3', name: 'sahel-blog', framework: 'nextjs', template: 'blog', createdAt: '2026-04-05', status: 'building' },
  { id: 'p4', name: 'cfa-pay-api', framework: 'react', template: 'api', createdAt: '2026-03-28', status: 'ready', url: 'https://cfa-pay.nebula.app' },
];

const seedDeployments: Deployment[] = [
  { uid: 'dpl_1', projectId: 'p1', url: 'kente-shop-ax42.nebula.app', state: 'READY', createdAt: Date.now() - 3600_000, duration: 42, commit: 'feat: add wax patterns' },
  { uid: 'dpl_2', projectId: 'p2', url: 'lagos-rides-bx88.nebula.app', state: 'READY', createdAt: Date.now() - 7200_000, duration: 51, commit: 'fix: payment flow' },
  { uid: 'dpl_3', projectId: 'p1', url: 'kente-shop-cy12.nebula.app', state: 'ERROR', createdAt: Date.now() - 86400_000, duration: 12, commit: 'wip: dashboard' },
];

const seedDomains: Domain[] = [
  { name: 'kente-shop.com', status: 'active', expiresAt: '2027-01-15', projectId: 'p1', autoRenew: true, registrar: 'namecheap' },
  { name: 'lagosrides.africa', status: 'active', expiresAt: '2026-11-22', projectId: 'p2', autoRenew: true, registrar: 'namecheap' },
];

const seedTxs: WalletTx[] = [
  { id: 'tx_1', type: 'topup', amount: 10000, currency: 'XOF', method: 'mtn', description: 'Recharge MTN Mobile Money', status: 'succeeded', createdAt: Date.now() - 86400_000 },
  { id: 'tx_2', type: 'usage', amount: -1500, currency: 'XOF', description: 'Hosting kente-shop (avril)', status: 'succeeded', createdAt: Date.now() - 172800_000 },
  { id: 'tx_3', type: 'topup', amount: 5000, currency: 'XOF', method: 'orange', description: 'Recharge Orange Money', status: 'succeeded', createdAt: Date.now() - 604800_000 },
  { id: 'tx_4', type: 'usage', amount: -800, currency: 'XOF', description: 'Domain renewal kente-shop.com', status: 'succeeded', createdAt: Date.now() - 1209600_000 },
];

const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('nebula-user') : null;

export const useApp = create<AppState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  projects: seedProjects,
  deployments: seedDeployments,
  domains: seedDomains,
  wallet: { balanceFcfa: 12700, balanceUsd: 21.16, txs: seedTxs },

  login: (email) => {
    const user: User = {
      id: 'u_' + Math.random().toString(36).slice(2, 9),
      name: email.split('@')[0].replace(/[._]/g, ' '),
      email,
      plan: 'starter',
    };
    localStorage.setItem('nebula-user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('nebula-user');
    set({ user: null });
  },
  addProject: (p) => {
    const project: Project = { ...p, id: 'p_' + Math.random().toString(36).slice(2, 9), createdAt: new Date().toISOString().slice(0, 10) };
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },
  updateProject: (id, patch) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  addDeployment: (d) => {
    const deployment: Deployment = { ...d, uid: 'dpl_' + Math.random().toString(36).slice(2, 9), createdAt: Date.now() };
    set((s) => ({ deployments: [deployment, ...s.deployments] }));
    return deployment;
  },
  updateDeployment: (uid, patch) =>
    set((s) => ({ deployments: s.deployments.map((d) => (d.uid === uid ? { ...d, ...patch } : d)) })),
  addDomain: (d) => set((s) => ({ domains: [d, ...s.domains] })),
  addWalletTx: (t) => {
    const tx: WalletTx = { ...t, id: 'tx_' + Math.random().toString(36).slice(2, 9), createdAt: Date.now() };
    set((s) => ({
      wallet: {
        ...s.wallet,
        balanceFcfa: s.wallet.balanceFcfa + (t.currency === 'XOF' ? t.amount : 0),
        balanceUsd: s.wallet.balanceUsd + (t.currency === 'USD' ? t.amount : 0),
        txs: [tx, ...s.wallet.txs],
      },
    }));
  },
}));
