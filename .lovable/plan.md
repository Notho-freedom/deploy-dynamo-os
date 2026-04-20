
# 🌌 NebulaOS — MVP UI complet, bilingue, afro-futuriste

Construire **toute l'interface et tous les flows** des 9 modules, conformes aux vraies APIs (Vercel, GitHub, Namecheap, Zoho, Stripe, Mobile Money, Supabase…), avec **données simulées** côté front. Aucune intégration backend réelle dans cette première itération — tout sera prêt à être branché plus tard.

---

## 🎨 Direction artistique — Bold afro-futuriste

- **Palette** : noir profond `#0A0612`, violet cosmique `#6B21A8`, orange solaire `#F97316`, doré `#FCD34D`, accent cyan `#06B6D4`
- **Motifs** : géométrie inspirée des tissus wax (chevrons, losanges), constellations en arrière-plan, dégradés violet→orange
- **Typo** : `Space Grotesk` (titres) + `Inter` (corps) + `JetBrains Mono` (code)
- **Effets** : glassmorphism léger, glow néon sur CTAs, animations subtiles (étoiles qui pulsent, shimmer sur cards)
- **Mode** : sombre par défaut (signature), toggle clair disponible

---

## 🌍 Bilingue FR/EN

- Switch langue dans le header (🇫🇷 / 🇬🇧)
- Tous les textes dans un dictionnaire i18n centralisé
- Préférence stockée en localStorage
- FR par défaut

---

## 📐 Structure des pages

### 1. Landing page `/`
- Hero : "Build, deploy, scale — depuis un seul endroit" + CTA "Commencer gratuitement"
- Bandeau social proof (logos clients fictifs)
- Section **9 modules** illustrés (cards interactives)
- Comparatif "Avant / Après NebulaOS" (fragmentation vs unifié)
- Pricing : Free / Starter (2000 FCFA) / Pro / Enterprise + toggle FCFA/USD
- Témoignages devs africains
- FAQ + footer complet

### 2. Auth `/auth`
- Login / Signup (UI uniquement, pas de backend)
- Boutons GitHub, Google (visuels)
- Redirection vers `/dashboard` après "connexion"

### 3. Dashboard `/dashboard`
- Sidebar avec accès aux 9 modules
- Vue d'ensemble : projets récents, stats wallet, activité récente, alertes
- CTA "Nouveau projet"

### 4. Modules — chaque module a son écran complet avec flows

| # | Module | Écran et flow simulé |
|---|--------|----------------------|
| 1 | **Project Builder** | Prompt input + galerie de templates + wizard de création (3 étapes) → projet ajouté à la liste |
| 2 | **UI Generation** | Prompt → preview UI mockée + édition visuelle basique + import image |
| 3 | **Backend Builder** | Schema designer (tables/champs) + générateur d'endpoints REST + config auth |
| 4 | **Deployment** | Bouton 1-click deploy → animation de build (logs streamés simulés) → URL générée |
| 5 | **Domain Management** | Recherche domaine (résultats simulés style Namecheap API) → checkout → DNS auto |
| 6 | **Email Setup** | Création email pro `contact@domain.com` → SMTP config affichée (style Zoho API) |
| 7 | **CI/CD** | Connexion GitHub (mock OAuth) → liste de repos → config workflow → historique de déploiements + rollback |
| 8 | **Monitoring** | Dashboards : logs, erreurs, requêtes, uptime — avec graphiques (recharts) données fake |
| 9 | **Billing / Wallet** | Solde wallet en FCFA + USD, historique transactions, recharge via Mobile Money (MTN/Orange) ou Stripe — flows complets jusqu'à confirmation simulée |

### 5. Settings `/settings`
- Profil, langue, thème, API keys (vault visuel), équipe, sécurité

---

## 🔧 Données et logique simulées

- **Store global** (Zustand ou React context) avec : utilisateur, projets, déploiements, domaines, transactions wallet
- Données seed réalistes (10+ projets exemples, historique transactions, logs)
- **Délais simulés** (`setTimeout`) pour reproduire les vrais temps d'API (build = 30s avec logs progressifs, achat domaine = 5s…)
- Toutes les structures de données calquées sur les **vraies réponses API** (Vercel deployments, Namecheap domains, Stripe charges, GitHub repos…) → migration future triviale

---

## 🔌 Connexions réelles "sans intervention"

Une fois le plan approuvé, je proposerai d'activer **Lovable Cloud** pour préparer le terrain (auth + DB plus tard) et **Lovable AI Gateway** pour rendre le module **Project Builder** et **UI Generation** déjà fonctionnels via prompt → réponse IA réelle (les autres modules restent mockés).

---

## 📦 Livrables de cette itération

✅ Landing complète bilingue
✅ Auth UI
✅ Dashboard + sidebar
✅ Les 9 écrans modules avec flows interactifs end-to-end (mockés)
✅ Settings
✅ Design system afro-futuriste cohérent (tokens, composants)
✅ i18n FR/EN avec switch
✅ Toutes les structures de données alignées sur les vraies APIs

🔜 **Itérations suivantes** (après validation visuelle) : activation Lovable Cloud, IA réelle sur Builder, puis branchements progressifs Vercel / GitHub / Stripe / Mobile Money.
