# Auréa Hosts & Operations — Guide de recette P0 (22 novembre 2026)

## Accès
- **Operations** : `/operations/` avec le mot de passe administrateur Auréa déjà configuré sur Netlify. Ne pas le mettre dans GitHub ou dans un e-mail public.
- **Hosts** : `/hosts/`, e-mail de la conciergerie et mot de passe temporaire généré par Operations.
- Les liens en préproduction commencent par `https://deploy-preview-7--aurea-services.netlify.app`; utiliser les liens en production après validation.

## Parcours de recette
1. Se connecter à Operations. Vérifier que les tableaux ne montrent aucune donnée inventée.
2. Créer une conciergerie de démonstration avec une adresse e-mail dont on maîtrise l'accès. Copier immédiatement son mot de passe généré, puis fermer la fenêtre.
3. Créer deux logements de démonstration avec adresses et consignes, sans y saisir de véritables codes d'accès.
4. Créer deux équipes. Dans Hosts, se connecter avec les identifiants de la conciergerie, voir uniquement ses logements.
5. Réserver un créneau futur en renseignant, si disponibles, le check-out et le prochain check-in. Vérifier l'état « Demandé » dans Hosts et Operations, puis modifier le créneau avant confirmation.
6. Dans Operations : confirmer **en sélectionnant une équipe** (ce qui réserve immédiatement sa capacité), puis affecter l'équipe à l'intervention. Créer une deuxième intervention se chevauchant sur la même équipe et confirmer le refus du conflit. Essayer de réserver deux ménages simultanés dans le même logement : le second doit être refusé.
7. Faire passer l'intervention « En cours » → « Contrôle qualité ». Remplir les quatre critères, joindre une photo non sensible, puis terminer.
8. Dans Hosts, vérifier le statut final, la photo et la chronologie. Signaler un incident et vérifier qu'il figure dans l'historique Auréa. Vérifier que la demande peut être annulée avant confirmation.
9. Créer une deuxième conciergerie ; vérifier qu'elle ne voit ni les logements, ni les demandes, ni les photos de la première.
10. Réinitialiser les accès de la première conciergerie. Vérifier que son ancien mot de passe et ses anciennes sessions ne fonctionnent plus.
11. Tester sur smartphone : saisie d'un logement, affichage du calendrier, consultation des détails.
12. Vérifier que la vitrine, les demandes de devis et l'ancienne Growth Console restent inchangées.

## Garde-fous techniques
- Accès conciergerie : cookie signé, HttpOnly, Secure, SameSite=Strict, durée limitée à huit heures. Mot de passe hashé avec scrypt. Les anciennes sessions sont invalidées lors d'une réinitialisation.
- Les queries serveur filtrent les objets par `company_id` ; les clés photo ne sont jamais exposées sans autorisation.
- Clé étrangère composite `(property_id,company_id)` empêchant la création d'une intervention sur un logement d'une autre conciergerie.
- Contrainte PostgreSQL `EXCLUDE USING gist` empêchant les doubles affectations d'une équipe sur un créneau chevauchant.
- Aucune intervention n'est considérée terminée sans checklist complète et au moins une preuve photo.
- Préproduction Netlify Database isolée de la production.
- Secrets Netlify nécessaires pour l'authentification administrateur : `AUREA_ADMIN_PASSWORD` et `AUREA_SESSION_SECRET` (ne jamais partager leurs valeurs).

## Limites explicites
Cette version P0 ne comporte **pas encore** de compte individuel pour les intervenants, de synchronisation Airbnb/Booking iCal, d'algorithme de tournée multi-adresses ni d'envoi SMS/WhatsApp automatisé. L'affectation, le démarrage et la validation qualité sont réalisés par un opérateur Auréa authentifié.

La réussite des tests automatisés ne remplace **pas** la recette métier authentifiée décrite ci-dessus. Ne pas donner les accès à de vrais partenaires avant validation de ces étapes.
