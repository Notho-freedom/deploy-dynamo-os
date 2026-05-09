# Itération 3 — Assets, polish, workflows complets, premières connexions réelles

## 1. Fix runtime error (priorité immédiate)

`Stepper` reçoit `current` au-delà de `steps.length` ou un step `undefined`. Trace : `at Array.map` → composant qui lit `.tone` sur un élément `undefined`. Probablement `Stepper.tsx` ou `Terminal.tsx` (lignes mappées). 

Action : durcir les composants partagés (`Stepper`, `Terminal`, `Sparkline`, `StatusDot`) avec guards (`?.tone`, `current = Math.min(current, steps.length)`), et corriger l'appelant fautif (Deploy.tsx — `setStepIdx(i + 1)` peut dépasser `steps.length` au dernier step).

## 2. Génération assets de partage

Tous via imagegen, palette neutre + ocre `#D97706`, géométrie inspirée adinkra, zéro vomi IA :

- `public/favicon.png` (512×512, transparent) — mark NebulaOS
- `public/favicon-32.png`, `public/apple-touch-icon.png` (180×180)
- `src/assets/og-default.jpg` (1200×630) — wordmark + tagline serif + texture wax discrète
- `src/assets/og-builder.jpg`, `og-deploy.jpg`, `og-cloud.jpg` (1200×630) — variantes par module
- `src/assets/social-square.jpg` (1080×1080) — LinkedIn/IG
- `src/assets/social-banner.jpg` (1500×500) — Twitter/X header
- `src/assets/logo-mark.svg`, `logo-wordmark.svg` — refonte vectorielle propre (remplace `Logo.tsx` SVG inline si meilleur)
- `src/assets/separator-1/2/3.svg` — glyphes éditoriaux
- 3 mini-screenshots stylisés pour la landing (Builder, Deploy, Backend) en 1200×800

Mise à jour `index.html` : `<link rel="icon">`, `apple-touch-icon`, OG/Twitter pointant sur les assets locaux (pas l'URL GCS actuelle), `theme-color`, manifest minimal.

## 3. Polish navigation dashboard

Sidebar actuelle trop serrée. Cibles :

- Items : `py-1.5` → `py-2.5`, gap icône/label `gap-2` → `gap-3`
- Sections : ajouter `mt-6` entre groupes (`Workspace`, `Project`, `Account`), label section en `text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 px-3 mb-2`
- Indicateur actif : barre 2px ocre + `bg-muted/30` plus visible
- Largeur sidebar : 220 → 240px pour respirer
- Topbar : `gap-2` → `gap-4` entre breadcrumb / ⌘K / status / lang / avatar

## 4. Complétion vues & workflows pixel-close

Audit + complétion par module (rester fidèle aux refs) :

- **Deploy** : ajouter onglets `Source` (file tree), `Functions` (table edge functions du déploiement), `Logs` runtime séparés du build ; bouton "Promote to production" fonctionnel sur l'historique
- **CICD** : finir le flow Import (étape 2 framework auto-detect avec icônes Next/Vite/Astro/Remix, env vars editor key/value, étape 3 redirige vers Deploy avec build qui démarre) ; section "Deployments per branch"
- **Builder/UIGen** : tab `Console` fonctionnel (logs preview), bouton "Open in editor" qui scroll vers Code, multi-fichiers dans le viewer, raccourci ⌘Enter pour envoyer
- **Backend** : table editor inline edit (cellules cliquables), SQL editor avec Run + résultats en grille, RLS toggle qui ouvre drawer policies, Auth → modal config provider (client ID/secret), Storage → upload simulé + preview, Edge Functions → logs streamés en parallèle de l'éditeur
- **Domains** : drawer DNS avec records suggérés (A, CNAME apex/www, MX Zoho, TXT verification), copy-to-clipboard, statut propagation simulée
- **EmailSetup** : preview inbox finale avec 3 mails seed + composer minimal
- **Monitoring** : toggle p50/p95/p99, table Top routes triable, Top errors avec stack trace expandable
- **Billing** : flow Stripe Elements simulé complet (carte, 3DS modal, success), Invoices PDF download mocké, downgrade/upgrade plan flow
- **Settings** : sections API Keys (générer/révoquer avec masque), Webhooks (CRUD + test ping), Team (invite par email, rôles)

## 5. Connexions réelles — premières activations

Activer **Lovable Cloud** (requis pour edge functions qui tiennent les clés OAuth/API) puis brancher progressivement.

### a. GitHub (OAuth réel)

- Edge function `github-oauth-start` → redirige vers `github.com/login/oauth/authorize`
- Edge function `github-oauth-callback` → échange code contre token, stocke en DB (table `connected_accounts`)
- Edge function `github-list-repos` → appelle `api.github.com/user/repos` avec token utilisateur
- Frontend CICD : remplace mock par appels réels, garde fallback simulé si pas connecté
- Secrets requis : `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (utilisateur les crée sur github.com/settings/developers)

### b. Vercel (API token utilisateur)

- Settings → "Connect Vercel" : input token ([https://vercel.com/account/tokens](https://vercel.com/account/tokens))
- Edge functions : `vercel-list-projects`, `vercel-list-deployments`, `vercel-create-deployment` (via `api.vercel.com/v13/deployments`)
- Deploy.tsx : si Vercel connecté pour le projet → utilise vraies données ; sinon mock
- Secret par utilisateur stocké côté DB chiffré (pas en env global)

### c. Zoho Mail (API)

- OAuth Zoho (`accounts.zoho.com/oauth/v2/auth`) — scopes `ZohoMail.organization.ALL`, `ZohoMail.accounts.ALL`
- Edge functions : `zoho-oauth-callback`, `zoho-create-mailbox`, `zoho-list-mailboxes`, `zoho-verify-domain`
- EmailSetup : étapes 1-3 restent guidées (DNS user-side), étape 4 crée vraiment la boîte si Zoho connecté
- Secrets : `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`

### d. Resend (le plus simple — confirmation envoi mails transactionnels)

- Connector Lovable disponible → 1 clic
- Utilisé pour : invitations team, alertes deploy fail, notif facturation

### e. Lovable AI Gateway (Builder réel)

- Edge function `builder-chat` → stream Gemini 2.5 Flash via `ai.gateway.lovable.dev`
- Builder/UIGen : remplace simulation tokens par vrai stream
- Aucun secret user-side (LOVABLE_API_KEY auto)

**Pas branchés cette itération** (restent simulés, marqués `Simulated` badge ghost) :

- Stripe (à activer via `enable_stripe_payments` quand user prêt)
- MTN/Orange/Wave/Moov (APIs partenaires nécessitent contrats commerciaux)
- Namecheap (API key user — itération suivante)
- Supabase direct (déjà couvert par Lovable Cloud sous le capot)

## 6. UX connexions

- Page `Settings → Integrations` : liste des intégrations avec statut (`Connected` / `Not connected` / `Simulated`), bouton Connect/Disconnect, scopes affichés, dernier sync
- Badge `Live` (vert) vs `Demo` (ghost) sur chaque module pour indiquer si données réelles ou mockées
- Toast "Switched to live data" quand connexion réussit

## 7. Détails techniques

- `connected_accounts` table : `user_id`, `provider`, `access_token` (chiffré), `refresh_token`, `expires_at`, `scopes`, `metadata jsonb`
- Helper `useIntegration(provider)` côté front → renvoie `{ connected, data, loading, connect, disconnect }`
- RLS : user ne voit que ses propres connexions
- Tous les edge functions : CORS, validation Zod des inputs, gestion erreur uniforme
- i18n : étendre pour libellés intégrations, états connexion, erreurs OAuth

## 8. Ordre de livraison

1. Fix runtime (immédiat)
2. Polish navigation (rapide)  et ajout de plus d'animations styles dev à l'app
3. Génération assets + index.html
4. Complétion workflows manquants (sans backend)
5. Activation Lovable Cloud
6. Branchement Resend + Lovable AI (zéro friction)
7. Branchement GitHub OAuth
8. Branchement Vercel
9. Branchement Zoho

## Livrable

Une grosse passe couvrant 1→4 et 5→6. Les étapes 7→9 demanderont à l'utilisateur de fournir Client ID/Secret OAuth qu'il créera sur GitHub/Zoho — je préparerai l'infra et lui donnerai les URLs de callback à coller, puis brancherai dès qu'il fournit les credentials.

⚠️ Charge importante (~30 fichiers + edge functions). Si la passe sature, je découperai sans perdre le plan.