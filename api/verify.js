// api/verify.js
// Vérifie auprès de Stripe qu'une session de paiement a bien été réglée.
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  try {
    const session_id = req.query.session_id;
    if (!session_id) { res.status(400).json({ error: "session_id manquant" }); return; }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === "paid";

    res.status(200).json({
      paid: paid,
      product: session.metadata && session.metadata.product
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
