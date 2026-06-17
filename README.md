# PaieDoc — guide de mise en ligne (pas à pas)

Ce dossier contient un site complet : page d'accueil + tarifs, deux générateurs
(fiche de paie, contrat de travail) et le paiement Stripe. Suivez les étapes
dans l'ordre. Aucune compétence en code n'est nécessaire : on copie des
fichiers et on colle une clé.

---

## Ce qu'il y a dans le dossier

```
index.html              → page d'accueil + tarifs
fiche-de-paie.html      → générateur de fiche de paie (avec paiement)
contrat-de-travail.html → générateur de contrat (avec paiement)
success.html            → page affichée après un paiement réussi
paywall.js              → filigrane + fenêtre d'achat + crédits (côté visiteur)
package.json            → liste la dépendance Stripe
api/create-checkout.js  → crée le paiement Stripe (côté serveur, secret)
api/verify.js           → vérifie qu'un paiement a bien eu lieu (côté serveur)
```

Le **secret Stripe n'est jamais dans le code** : on le mettra dans Vercel
comme « variable d'environnement ». C'est la règle de sécurité n°1.

---

## Comment marche le paiement (en une phrase)

Le visiteur remplit son document → il voit un aperçu **filigrané** → il clique
sur « Télécharger » → la fenêtre d'achat s'ouvre (avec la case d'attestation) →
il paie sur Stripe → il revient sur le site avec ses **crédits** → il télécharge
le PDF **sans filigrane**. 1 fiche = 10 €, ou le pack 3 fiches + 1 contrat = 50 €.

---

## ÉTAPE 1 — Récupérer votre clé Stripe (5 min)

1. Connectez-vous à https://dashboard.stripe.com (votre compte LLC).
2. En haut à droite, laissez **Mode test** activé pour commencer.
3. Menu **Développeurs → Clés API**.
4. Copiez la **clé secrète** qui commence par `sk_test_...`
   (gardez-la précieusement, ne la mettez jamais dans un message ni dans le code).

> Plus tard, pour encaisser de vrais paiements, vous reviendrez prendre la clé
> `sk_live_...` (mode réel).

---

## ÉTAPE 2 — Mettre les fichiers sur GitHub (10 min)

1. Créez un compte gratuit sur https://github.com
2. Cliquez **New repository** → nommez-le `paiedoc` → **Create**.
3. Sur la page du dépôt, cliquez **uploading an existing file**.
4. Glissez-déposez **tout le contenu de ce dossier**, en gardant le sous-dossier
   `api/` (déposez le dossier `api` tel quel pour conserver la structure).
5. Cliquez **Commit changes**.

---

## ÉTAPE 3 — Déployer sur Vercel (10 min)

1. Créez un compte gratuit sur https://vercel.com avec « Continue with GitHub ».
2. **Add New → Project** → sélectionnez votre dépôt `paiedoc` → **Import**.
3. **AVANT de déployer**, ouvrez la section **Environment Variables** et ajoutez :
   - **Name** : `STRIPE_SECRET_KEY`
   - **Value** : votre clé `sk_test_...` (puis `sk_live_...` plus tard)
   - cliquez **Add**.
4. Cliquez **Deploy**. Patientez ~1 minute.
5. Vercel vous donne une adresse du type `https://paiedoc.vercel.app` : votre site est en ligne.

> Si vous changez la clé plus tard (passage en réel), allez dans
> **Project → Settings → Environment Variables**, modifiez la valeur, puis
> **Deployments → Redeploy**.

---

## ÉTAPE 4 — Tester un achat (mode test)

1. Ouvrez votre site, allez sur « Créer une fiche de paie », remplissez, cliquez **Télécharger**.
2. Dans la fenêtre, cochez l'attestation, choisissez une formule, **Continuer vers le paiement**.
3. Sur la page Stripe, utilisez la carte de test :
   - Numéro : `4242 4242 4242 4242`
   - Date : n'importe quelle date future · CVC : n'importe quel 3 chiffres
4. Après paiement, vous revenez sur la page de confirmation, vos crédits sont ajoutés,
   et le téléchargement du PDF se fait **sans filigrane**. 🎉

---

## ÉTAPE 5 — Passer en vrai (encaisser réellement)

1. Dans Stripe, basculez en **Mode réel** (interrupteur en haut à droite),
   en vous assurant que votre compte LLC est bien activé pour les paiements.
2. Reprenez la clé secrète **`sk_live_...`** (Développeurs → Clés API).
3. Dans Vercel, remplacez la valeur de `STRIPE_SECRET_KEY` par la clé `sk_live_...`,
   puis **Redeploy**.
4. Les paiements sont désormais réels et versés sur le compte de votre LLC.

---

## ÉTAPE 6 — Brancher votre nom de domaine (optionnel)

1. Achetez un domaine (Namecheap, OVH, Cloudflare…).
2. Dans Vercel : **Project → Settings → Domains → Add**, saisissez votre domaine,
   et suivez les instructions DNS indiquées (copier-coller chez votre registrar).

---

## Personnaliser

- **Changer les prix** : ouvrez `api/create-checkout.js` et modifiez `amount`
  (en centimes : `1000` = 10 €). Mettez aussi à jour les libellés dans
  `index.html` et `paywall.js`. Redéployez.
- **Changer le nom / le logo** : remplacez « PaieDoc » et la lettre « P »
  dans `index.html` (barre du haut et pied de page), et `[VOTRE LLC]` dans le pied de page.
- **Ajouter un document** (attestation, certificat…) : dupliquez un générateur,
  ajoutez le produit dans `paywall.js` et `api/create-checkout.js`. Je peux vous
  coder ces nouveaux documents quand vous voulez.
- **Pages légales** : créez `mentions-legales.html`, `cgv.html`,
  `confidentialite.html` (liens déjà présents dans le pied de page).

---

## À savoir (limites de cette première version)

- Les crédits sont mémorisés **dans le navigateur** de l'acheteur. C'est simple
  et sans base de données, mais : un client qui change d'appareil ne retrouvera
  pas ses crédits, et un utilisateur très technique pourrait les contourner.
  Pour un vrai suivi (comptes clients, crédits liés à un email), l'étape suivante
  est d'ajouter une base de données (Supabase) — faisable plus tard.
- Le filigrane « SPÉCIMEN » protège l'aperçu à l'écran ; le PDF propre n'est
  généré qu'après paiement.

---

## Rappels importants (juridique)

- Conservez la case d'**attestation sur l'honneur** avant achat (déjà en place).
- Faites rédiger/valider vos **CGV, mentions légales et politique de
  confidentialité** par un professionnel.
- La **TVA européenne** s'applique même à une LLC US qui vend à des particuliers
  dans l'UE : faites le point avec un comptable (une solution « marchand de
  référence » comme Lemon Squeezy/Paddle peut s'en charger à votre place si vous
  préférez ne pas la gérer via Stripe).
- Les documents générés sont indicatifs : ce n'est pas un logiciel de paie certifié.

Bon lancement — et dites-moi quand vous voulez que j'ajoute les attestations et
autres documents au catalogue.
