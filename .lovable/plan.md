
# Refonte NebulaOS — sortir du look "IA générique"

Objectif: tuer les patterns reconnaissables (cartes partout, bordures partout, gradients violet/orange criards, hero "headline + 2 CTA + 3 features cards"), et atteindre un niveau Vercel/Linear avec accents afro subtils. Workflows pixel-close à Vercel (Deploy/CICD), Lovable (Builder/UI), Lovable Cloud + Render (Backend).

---

## 1. Nouveau design system (refonte tokens)

Casser le violet/orange saturé actuel. Nouvelle base sobre type Linear/Vercel + accents afro intégrés finement.

- **Palette**
  - `background` quasi-noir neutre `#0A0A0B` (pas violet)
  - `foreground` blanc cassé `#EDEDED`
  - `muted` gris froids `#9CA3AF` / surfaces `#111113`, `#17171A`
  - `border` `#1F1F23` (1px, jamais 2px, jamais arrondies de partout)
  - **1 seul accent fort**: ocre/terre cuite `#D97706` style bogolan (pas orange fluo)
  - **1 accent secondaire**: indigo profond `#4338CA` (très parcimonieux)
  - Or `#E8B14A` réservé aux états premium / hover sur liens éditoriaux
- **Typographie**
  - UI: `Geist` ou `Inter` (déjà présent), tracking serré, poids 400/500/600 — **bannir les `font-bold` partout**
  - Display éditorial: `Fraunces` ou `Instrument Serif` italique pour H1/baselines (touche éditoriale qui casse l'IA)
  - Mono: `Geist Mono` / `JetBrains Mono` pour data, IDs, URLs, logs
- **Radius** `--radius: 6px` (pas 12px), surfaces majoritairement carrées, arrondi seulement sur boutons & inputs
- **Élévation**: aucune ombre par défaut. Séparation par `border-top` 1px + couleur de surface — pas de "glass" ni de glow
- **Density**: dashboards en lignes/listes/tableaux, pas en grille de cartes. Fin liserés, beaucoup de mono, beaucoup de vide
- **Motion**: micro (150–200ms ease-out), zéro pulse-glow, zéro shimmer permanent, zéro float
- **Suppression**: classes `.glass`, `.glow`, `.gradient-cosmic` partout; `.wax-pattern` et `.stars-bg` retirés des layouts (on les ressort uniquement comme texture éditoriale ponctuelle sur landing/hero, pas sous tout l'app)

Accents afro **discrets**:
- Bordure haute 1px en dégradé bogolan sur le header app (4px de gradient subtil, pas plus)
- Motif géométrique (kente/adinkra simplifié SVG) en watermark 4% d'opacité sur sections éditoriales
- Ornement séparateur (petit glyphe adinkra) entre sections de la landing

## 2. Assets à générer

- Logo NebulaOS SVG (mark géométrique inspiré adinkra "Nyame Dua" + wordmark)
- 1 illustration hero éditoriale (texture wax très épurée, dominante terre cuite/noir)
- 3 motifs séparateurs SVG (glyphes géométriques)
- 1 OG image
- Favicons

Tous via imagegen (premium pour le hero, fast pour le reste), stockés dans `src/assets/`.

## 3. Refonte Landing (`Index.tsx`)

Casser l'ossature "hero + grid features + pricing + faq".

Nouvelle structure éditoriale:
1. **Header** ultra-minimal (wordmark gauche, 4 liens centrés mono, Sign in / Get started droite, ligne 1px en bas)
2. **Hero éditorial** asymétrique: H1 en serif italique mêlé sans-serif ("Build, ship & **monétiser** depuis l'Afrique"), sous-titre court, **un seul** CTA primaire + lien secondaire, à droite un bloc "terminal live" qui tape une commande `nebula deploy ./` avec sortie streamée
3. **Bandeau logos** clients/stack (GitHub, Stripe, MTN, Orange, Wave, Zoho) en gris désaturé
4. **Section "How it works"** en stepper horizontal numéroté (01—04) plein largeur, typo énorme, pas de cartes
5. **Modules** présentés en **liste éditoriale** (split 50/50: titre serif + paragraphe + mini-screenshot du module, alterné gauche/droite). 9 modules = 9 sections, pas une grille
6. **Section "Built for Africa"**: bloc texte + carte stylisée du continent avec points lumineux (Abidjan, Lagos, Dakar, Nairobi, Kinshasa)
7. **Pricing** en tableau comparatif dense (3 colonnes, pas 3 cartes flottantes), toggle FCFA/USD discret en haut à droite du tableau
8. **FAQ** en accordion sobre (pas de cartes, juste lignes 1px)
9. **Footer** multi-colonnes éditorial avec gros wordmark bas, manifeste en serif italique

## 4. Refonte Auth (`Auth.tsx`)

Layout split-screen façon Linear/Vercel: panneau gauche avec quote/manifeste serif + texture wax très subtile, panneau droit form ultra-épuré (Email → magic link / OAuth GitHub, Google, Apple), pas de carte centrée avec gradient.

## 5. Refonte Shell Dashboard (`DashboardLayout.tsx`)

Inspiration Vercel/Linear:
- Sidebar fine 220px, fond identique au body (pas de surface différente), items en mono 13px, regroupements `Workspace` / `Project` / `Account`, indicateur actif = barre 2px gauche en accent ocre
- Topbar 48px: breadcrumb (Workspace / Project / Section), command palette `⌘K` au centre (Cmd+K ouvre dialog avec recherche projets/actions), à droite: status système (point vert + "All systems normal"), notifications, switch FR/EN, avatar
- Suppression du fond étoilé global

## 6. Refonte Dashboard overview (`Dashboard.tsx`)

Suppression du grid de stat cards. Nouvelle structure:
- En-tête: "Overview" + select projet
- **Bandeau métriques inline** (4 KPI sur une ligne séparée par filets verticaux, sans cartes): Requests, Bandwidth, Build minutes, Errors — chaque KPI = grand chiffre + sparkline 60px sous-jacente
- **Activity feed** colonne gauche (timeline 1px, items: deploys, commits, errors, payments) — façon Vercel activity
- **Projects table** colonne droite: liste dense (nom mono, framework badge ghost, dernier deploy relative time, statut point coloré, URL, menu `⋯`)
- Footer section: "Usage this month" en barres horizontales fines (pas de donut)

## 7. Refonte modules (pixel-close)

### Deploy (`Deploy.tsx`) — Vercel-like
Layout 3 zones type Vercel deployment detail:
- En-tête: nom déploiement, badge statut (Ready/Building/Error), URL, commit, branche, durée, "Visit" / "..." menu
- Tabs: **Deployment** | **Source** | **Functions** | **Logs** | **Runtime Logs**
- Timeline build verticale gauche (Queued → Cloning → Installing → Building → Deploying → Ready) avec durées par étape
- Logs panel droit: terminal noir pur, syntax highlighting, autoscroll, bouton "Copy" / "Download", filtres niveau
- Sous le terminal: "Build Output" arborescence fichiers + tailles
- Liste deployments: tableau dense (Status • URL • Source commit + author avatar • Branch • Duration • Created), pas des cartes

### CICD (`CICD.tsx`) — Vercel Git integration-like
- État non connecté: grand bloc centré "Connect GitHub" → modal OAuth simulé (écran GitHub authorize fidèle: header noir GitHub, liste permissions, boutons "Authorize" vert)
- État connecté: tableau repos avec recherche, filtre org, "Import" sur chaque ligne
- Flow Import: étape 1 sélection repo → étape 2 configure project (root dir, framework auto-détecté avec icône, build command, output dir, env vars) → étape 3 déploiement initial qui bascule sur Deploy
- Section "Deployments" par branche, "Production branch" sélecteur
- Rollback: dropdown "Promote to production" sur deploy historique

### Builder (`Builder.tsx`) — Lovable-like
- Layout 2 colonnes: gauche = chat conversationnel (bulles user/assistant, streaming token-par-token simulé, attachments image, suggestions de prompts), bas = textarea avec attach + send
- Droite = preview iframe simulée (sandbox URL fake) avec toggle Desktop/Tablet/Mobile, bouton refresh, bouton "Open in editor", URL bar
- Au-dessus preview: tabs **Preview** | **Code** | **Console** (Code = arborescence fichiers + viewer monaco-like syntax)
- Premier écran (projet vide): hero centré "What do you want to build?" + textarea prompt + 6 templates en chips (SaaS, Marketplace, Dashboard, Landing, Blog, Mobile App)

### UIGen (`UIGen.tsx`) — Lovable-like
Variant du Builder spécialisé "section/page" — même UX chat+preview mais avec sélecteur "Generate component" / "Generate page" / "Edit existing"

### Backend (`Backend.tsx`) — Lovable Cloud + Render
Tabs: **Database** | **Auth** | **Storage** | **Edge Functions** | **Secrets** | **Logs**
- Database: liste tables sidebar + table editor type Supabase (rangs éditables inline, types colonnes, RLS toggle, SQL editor en bas avec bouton Run)
- Auth: providers list (Email, Google, GitHub, Apple, Phone) avec switches, users table
- Storage: buckets + file browser
- Edge Functions: liste functions + éditeur code + logs en temps réel + endpoint URL + "Deploy"
- Secrets: key/value masqué + bouton reveal + add
- Logs: stream type Render (filtre service, niveau, search, timestamp ms)

### Domains (`Domains.tsx`)
Style Vercel Domains: search bar large + résultats avec `.com` `.io` `.app` `.africa` `.ci` `.sn` etc., prix FCFA+USD, bouton Add. Section "Your domains" tableau (Domain • Project • Nameservers status • Expiry • Actions). Drawer config DNS (A, CNAME, MX, TXT) avec records suggérés.

### EmailSetup (`EmailSetup.tsx`)
Wizard 4 étapes Zoho-like: 1. Domaine 2. Vérif TXT (record affiché à copier) 3. MX records 4. Création boîtes (form: nom@domaine, mot de passe, alias). Inbox preview minimaliste à la fin.

### Monitoring (`Monitoring.tsx`)
Style Vercel Analytics + Render metrics: filtres période (1h, 24h, 7d, 30d) + projet, charts (CPU, Memory, Requests, p50/p95/p99 latency, Error rate), tableau "Top routes" et "Top errors". Charts en lignes fines, axes discrets, pas de gradients massifs.

### Billing (`Billing.tsx`)
- En-tête: solde wallet en grand (XOF + équivalent USD)
- Tabs: **Overview** | **Top up** | **Transactions** | **Plans** | **Invoices**
- Top up: choix méthode en liste (MTN MoMo, Orange Money, Wave, Moov, Carte Stripe) → flow fidèle (numéro tel + montant → écran "Vérifiez votre téléphone" + code USSD affiché + spinner attente confirmation → success). Stripe = formulaire Elements simulé.
- Transactions: tableau dense avec icônes provider, statut, ref ID mono
- Plans: tableau comparatif (Free / Pro / Business / Enterprise)

### Settings (`Settings.tsx`)
Sidebar interne (Profile, Team, Billing, API Keys, Webhooks, Domains défaut, Preferences) + panneau form épuré.

## 8. Composants nouveaux à créer

- `CommandPalette` (cmdk) — recherche globale ⌘K
- `Terminal` — composant réutilisable terminal noir avec streaming + copy
- `OAuthSimulator` — modal qui mime fidèlement écrans GitHub/Google/Apple authorize
- `MobileMoneyDialog` — wizard paiement Mobile Money fidèle (USSD/STK push)
- `DataTable` dense (tri, filtres, pagination, bulk actions) — utilisé partout
- `Sparkline` léger SVG inline
- `StatusDot` (vert/jaune/rouge/gris) + `Badge` ghost (variant `outline` discret remplace les badges colorés)
- `EmptyState` éditorial (illustration SVG géométrique + une phrase serif)
- `Stepper` horizontal et vertical
- `Breadcrumb` app

## 9. i18n

Étendre `i18n.ts` pour couvrir 100% des nouveaux écrans, libellés produits (Vercel/Render/Zoho-like), états de build, erreurs.

## 10. Détails techniques

- Refonte `tailwind.config.ts`: nouvelles couleurs HSL, suppression gradients cosmic/aurora/nebula du theme par défaut (gardés en utilities ponctuelles), ajout `fontFamily.serif` (Fraunces), `fontFamily.mono` (Geist Mono)
- Refonte `index.css`: nouveau set de tokens (light + dark), suppression `.glass` `.glow` `.stars-bg` du layout global, ajout utilities `.editorial-divider`, `.wax-accent` (limitées)
- Ajout `cmdk` (command palette), `react-syntax-highlighter` pour viewer code, `monaco-editor`/`@uiw/react-codemirror` (préférence: codemirror, plus léger) pour éditeurs SQL/Edge Functions
- Toutes les pages migrent de "grid de cards" vers tables/listes/timelines
- Conserver `store.ts` (Zustand) — étendre avec: `currentDeployment`, `githubRepos[]`, `dbTables[]`, `edgeFunctions[]`, `transactions[]`, `domains[]` enrichis (DNS records), `mailboxes[]`
- Données de simulation réalistes pour chaque module (repos GitHub plausibles, deployments avec vraies durées, transactions Mobile Money avec refs MTN/Orange réalistes)

## 11. QA finale

- Parcourir chaque écran à 1267px ET 375px
- Vérifier contraste WCAG AA sur fond sombre
- Vérifier que **zéro** "card avec border arrondie + gradient" ne subsiste hors landing
- Vérifier que tous les flows interactifs vont bien jusqu'au bout (deploy → success → URL ouvrable, mobile money → confirm → wallet crédité, github → import → deploy, etc.)

## Livrable

Une refonte complète en une passe: nouveau design system + nouveaux assets + landing/auth/shell/9 modules/settings refaits, workflows pixel-close, bilingue FR/EN.

⚠️ C'est un gros chantier (≈25-30 fichiers touchés/créés). Si une seule passe dépasse, je découperai la livraison sans rien perdre du plan.
