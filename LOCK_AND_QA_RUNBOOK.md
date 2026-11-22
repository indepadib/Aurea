# Auréa — Fiche appartement, code serrure & photos post-ménage

## Protocole d'utilisation
1. L'hôte ouvre **Hosts → Logements → Ouvrir la fiche → Modifier la fiche**.
2. Il choisit le mode d'accès. Si « Serrure à code », il doit renseigner un code de 3 à 64 caractères. Pour une remise de clés, il complète les consignes spécifiques.
3. Le code est chiffré en AES-256-GCM avant stockage dans PostgreSQL. Il n'apparaît pas dans les listes, ni dans les données générales des plannings. Le code peut être renouvelé dans la fiche, sans ressortir l'ancien.
4. La coordination Auréa et la conciergerie propriétaire peuvent afficher le code sur demande explicite dans le dossier. Les intervenants affectés ne peuvent l'afficher **que pendant une mission aux états affecté/en cours/QA**. Le code est masqué automatiquement après 30 secondes côté interface ; l'API répond avec « no-store ». Chaque lecture et mise à jour est journalisée **sans le secret**.
5. Les intervenants déposent leurs photos dans Field, en classant « Avant ménage », « APRÈS ménage » ou « Incident ». Le module Operations peut également déposer une photo post-ménage à partir du dossier d'intervention **ou du dossier appartement**.
6. Pour soumettre au contrôle qualité ou valider la clôture, il faut **les quatre critères de checklist** ainsi qu'au moins une photo « APRÈS ménage » déposée après l'heure de démarrage enregistrée. Une photo historique, « Avant » ou « Incident » ne satisfait pas cette condition.
7. Depuis **Hosts → Logements → Ouvrir la fiche**, l'hôte voit les informations du logement, les consignes, l'historique des interventions et la galerie des photos, sans voir automatiquement le code.

## Recette de sécurité impérative avant déclaration GO
- Créer deux conciergeries et deux équipes avec des données synthétiques : chacune ne doit voir que ses appartements et ses photos.
- Tenter d'accéder au code depuis un membre non affecté, une mission annulée et une mission terminée : refus côté serveur attendu.
- Vérifier qu'une photo « Avant » ou une photo historique ne permet pas le statut « Terminée ».
- Contrôler les sessions périmées, la révocation d'un compte, l'absence de code clair dans le listing et les réponses de l'API.
- Vérifier le comportement mobile (375px), les photos JPEG/PNG/WebP et les erreurs sans révéler de secret.

## Attention au secret de chiffrement
Le serveur utilise `AUREA_LOCK_ENCRYPTION_KEY` lorsqu'il est configuré ; à défaut, la clé de session existante `AUREA_SESSION_SECRET` sert de racine avec une dérivation séparée par usage. **Ne jamais changer la racine de chiffrement ou activer une nouvelle clé sans plan de migration des codes déjà chiffrés**. Ne jamais copier la clé ou les codes dans GitHub, des logs ou des tickets.

La validation finale de l'état « Terminé » est contrôlée par le serveur ; l'identification visuelle d'un logement réellement nettoyé reste de la responsabilité du contrôleur Auréa et n'est pas prouvée par la simple présence d'une photo catégorisée.
