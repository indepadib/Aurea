# Auréa Field — Guide de recette et d'exploitation

## Accès privés
- Coordination : `/operations/` avec l'accès admin déjà configuré dans Netlify.
- Terrain : `/field/` avec **un compte personnel par intervenant**.
- Conciergeries : `/hosts/`, inchangé.

## Activation d'un compte terrain
1. Dans Operations, créer l'équipe (si elle n'existe pas).
2. Ouvrir l'onglet **Intervenants** puis **Ajouter un intervenant** : renseigner son nom, son e-mail personnel de connexion et son équipe.
3. Copier le mot de passe temporaire affiché une seule fois, le transmettre par un canal privé. Ne jamais le publier dans un commit, une capture publique ou un message de groupe.
4. En cas de départ ou de perte de téléphone : **Suspendre** immédiatement l'accès ; cela invalide toutes les sessions. Une réinitialisation de mot de passe invalide également toutes les sessions existantes.
5. Seules les personnes explicitement affectées à une équipe active peuvent se connecter et consulter les missions de cette équipe.

## Recette opérationnelle (avec comptes de test uniquement)
1. Depuis Hosts, créer une demande et renseigner le logement, les horaires et la prochaine arrivée.
2. Operations confirme **avec une équipe réservée**. L'intervention passe ensuite en état **Affectée**.
3. Connecter l'intervenant de cette équipe sur `/field/` et vérifier que la mission apparaît.
4. Vérifier que l'intervenant d'une autre équipe ne voit pas la mission ni ses consignes, photos ou incidents.
5. Vérifier l'adresse, l'itinéraire et les consignes **avant de démarrer**.
6. Appuyer sur **Je suis sur place — Démarrer**. L'heure de début réelle doit être horodatée côté serveur.
7. Cocher la checklist, renseigner les remarques, joindre au moins une photo JPEG/PNG/WebP (3 Mo max).
8. **Soumettre au contrôle qualité**. Sans checklist complète ou sans photo, l'API doit refuser l'étape.
9. Vérifier dans Operations et Hosts l'état **Contrôle qualité**, les photos et la chronologie. Seule la coordination Auréa valide le statut **Terminée**.
10. Signaler un incident important, vérifier qu'il remonte sur le cockpit Operations et dans l'historique ; tester les accès après suspension du compte.

## Limites explicites
- Aucun suivi GPS continu ni géolocalisation automatique du personnel : seule une adresse ou position du logement sert à ouvrir une carte.
- Les photos sont accessibles via un endpoint authentifié. Éviter les documents d'identité, coordonnées personnelles et possessions sensibles dans les photos de preuve.
- Les alertes d'incident sont visibles sur Operations **mais n'envoient pas automatiquement de SMS, WhatsApp ou e-mail**.
- Les intervenants ne peuvent ni confirmer des demandes, ni modifier les affectations, ni terminer administrativement une intervention.
- Les opérations restent en bêta privée tant qu'une recette intégrée sur comptes réels distincts n'a pas été signée.
