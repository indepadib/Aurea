# Auréa Growth Console — admin v1

## Environnement

Le dépôt conserve la vitrine actuelle `index.html` et `forms.html` **sans modifier leur contenu**. La nouvelle compilation copie uniquement la vitrine et `admin/` vers `dist/`; le code serveur et les migrations ne sont pas rendus publics.

### État actuel

- Le code est sur la branche `feature/admin-growth-crm` : **aucun déploiement de production autorisé**.
- Accessible **après déploiement et configuration** à `https://aurea-services.netlify.app/admin/`.
- Base de données Netlify Database (PostgreSQL) : une migration crée `aurea_crm_records`, indépendante des formulaires publics.
- Authentification serveur par mot de passe + session signée, cookie HttpOnly/Secure/SameSite Strict, origine vérifiée pour les écritures, rate limiting.
- 5 collections CRUD : prospects, demandes, partenaires, contenus, tâches; backlog initial de tâches et d'idées de contenu préchargé.
- Dashboard calculé uniquement à partir des vraies fiches enregistrées. Aucune donnée fictive.

## Avant une publication

1. Vérifier dans Netlify que le projet `aurea-services` est lié au dépôt `indepadib/Aurea`.
2. **Valider le plan et les coûts de Netlify Database avant d'activer l'installation/déploiement.** Le package `@netlify/database` peut déclencher le provisionnement d'une base avec consommation de crédits.
3. Définir deux variables **secrètes** côté Netlify (Project configuration → Environment variables), scope `Functions`, contexte `production` (et preview seulement si tests prévus) :
   - `AUREA_ADMIN_PASSWORD` : mot de passe unique d'au moins 16 caractères.
   - `AUREA_SESSION_SECRET` : secret indépendant d'au moins 32 caractères; par exemple générer avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
4. Réaliser un **déploiement preview** et tester intégralement la connexion, la déconnexion, les 5 collections, les opérations création/modification/suppression, ainsi que le refus d'accès anonyme.
5. Vérifier que la vitrine publique, les images, les ancres et le formulaire Netlify continuent à fonctionner.
6. Publier ensuite la PR approuvée en production. Les changements de variables d'environnement nécessitent un nouveau déploiement.

Aucune clé API de service ou de base n'est exposée au navigateur.

## MVP : fonctionnalités

- **Dashboard** : nombre de prospects, demandes, clients/réservations, CA déclaré et marge contributive, pipeline et prochaines actions.
- **Prospects B2B** : historique de qualification, source publique, priorité, relance, contact professionnel, consentement.
- **Demandes HOME / HOSTS** : statut, devis, CA, coût variable, prochaines actions.
- **Partenaires** : pressing, blanchisserie, agence, conciergerie.
- **Contenu** : Facebook, Instagram, univers HOME/HOSTS, statut, date, CTA et texte.
- **Tâches** : priorité, responsable, échéance, état.
- Recherche, filtres, modification et suppression avec confirmation.

Les créations dans l'admin **n'envoient pas de messages, ne publient pas de posts et ne réservent pas de prestations automatiquement**.

## Non inclus en v1

- Synchronisation **des futures soumissions vérifiées** de Netlify Forms vers le CRM par événement Netlify signé. Exige consentement explicite et dédoublonnage; les 3 soumissions historiques sont à qualifier manuellement avant tout import.
- Publication automatique Facebook et Instagram (connexion Metricool et autorisations supplémentaires).
- Agent IA WhatsApp ou prospection automatisée.
- Connexion multi-utilisateurs, permissions par rôle, journal d'audit avancé.
- Import de prospects Airbnb par scraping (à éviter : conditions des plateformes et vie privée).
- Planning des intervenantes, facturation, réservation client.

## Limites et bonnes pratiques

- Le mot de passe est partagé entre opérateurs autorisés : prévoir un vrai système d'identité et des rôles quand l'équipe grandit.
- Les contacts B2B sont à qualifier, la base ne doit pas contenir de coordonnées personnelles récupérées sans base légitime.
- Les formulaires publics continuent à vivre dans Netlify Forms; le CRM n'affiche pas encore automatiquement leurs données.
- Les devis sont préparés dans le CRM; la disponibilité réelle est confirmée par une personne.
- Un backlog initial de 8 tâches et 3 idées de contenus est initialisé par migration. Aucun prospect, client, revenu ou prestation fictive n’est créé; les KPIs business partent de zéro.
- Export et sauvegarde avancés à ajouter avant passage à l'échelle.

## Tests conseillés

- Anonyme : GET/POST/PUT/DELETE `/api/aurea-crm` → 401.
- Sans secrets : login désactivé, aucun accès aux données.
- Mauvais mot de passe : 401; brute force limité par Netlify.
- Session valide : toutes les listes et sauvegardes fonctionnent.
- Session expirée : retour sur l'écran de connexion.
- CSRF : requête POST avec une autre origine → 403.
- Accès public : `/`, `/#hospitality`, images, `/forms.html`, Netlify Forms toujours opérationnels.
- Vérifier que `/lib/`, `/netlify/`, `/.env`, `/package.json` ne sont **pas** publiés : seul `dist/` est servi.

## Développement

Node.js 22+ recommandé.

```sh
npm install
npm run build
npx netlify dev
```

La base locale se lance via les outils Netlify; appliquer les migrations locales selon `netlify database migrations apply`. Ne jamais appliquer une migration manuellement sur la production.

## Activation sécurisée — 21 novembre 2026

- Les variables secrètes `AUREA_ADMIN_PASSWORD` et `AUREA_SESSION_SECRET` ont été vérifiées présentes dans Netlify avec accès Functions en production, sans lecture de leurs valeurs.
- La configuration du mot de passe étant postérieure au déploiement précédent, ce changement documentaire déclenche une reconstruction Netlify pour que les variables soient disponibles au runtime.
- Validation de la connexion et des parcours CRUD authentifiés à effectuer après le redéploiement ; ne pas interpréter la simple présence des variables comme un test de connexion réussi.
