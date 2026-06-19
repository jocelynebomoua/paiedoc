// api/create-checkout.js
// Crée une session de paiement Stripe. La clé secrète vient de la variable
// d'environnement STRIPE_SECRET_KEY configurée dans Vercel (jamais dans le code).
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Prix en centimes. Modifiez ici pour changer vos tarifs.
const PRODUCTS = {
  fiche:   { name: "Fiche de paie",                     amount: 1000 }, // 10,00 € (8,00 € dès 5)
  contrat: { name: "Contrat de travail (1 document)",   amount: 3000 }, // 30,00 €
  bundle:  { name: "Pack 3 fiches de paie + 1 contrat", amount: 5000 }  // 50,00 €
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const product = (body && body.product) || "";
    const p = PRODUCTS[product];
    if (!p) { res.status(400).json({ error: "Produit inconnu" }); return; }

    // Quantité (uniquement pour les fiches) + tarif dégressif : 8 € l'unité dès 5 fiches.
    let qty = parseInt(body && body.qty, 10);
    if (!qty || qty < 1) qty = 1;
    if (qty > 24) qty = 24;

    let unit = p.amount, name = p.name, quantity = 1;
    if (product === "fiche") {
      unit = qty >= 5 ? 800 : 1000;
      name = qty > 1 ? (qty + " fiches de paie") : "Fiche de paie";
      quantity = qty;
    } else {
      qty = 1;
    }

    const origin = req.headers.origin || ("https://" + req.headers.host);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: quantity,
        price_data: {
          currency: "eur",
          unit_amount: unit,
          product_data: { name: name }
        }
      }],
      success_url: origin + "/success.html?session_id={CHECKOUT_SESSION_ID}&product=" + product + "&qty=" + qty,
      cancel_url: origin + "/?canceled=1",
      metadata: { product: product, qty: String(qty) }
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
