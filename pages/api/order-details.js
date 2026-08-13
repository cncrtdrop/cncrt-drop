import Stripe from "stripe";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "").trim(), {
  maxNetworkRetries: 3,
  timeout: 20000,
  httpClient: Stripe.createNodeHttpClient(),
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non supportée" });
  }

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: "session_id manquant" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items", "customer_details"],
    });

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Paiement non confirmé" });
    }

    const items = session.line_items.data.map((li) => ({
      name: li.description,
      quantity: li.quantity,
      amount: li.amount_total / 100,
    }));

    return res.status(200).json({
      orderNumber: session.id.replace("cs_test_", "").replace("cs_live_", "").slice(0, 12).toUpperCase(),
      total: session.amount_total / 100,
      currency: session.currency,
      email: session.customer_details?.email || null,
      shippingAddress: session.shipping_details?.address || session.customer_details?.address || null,
      shippingName: session.shipping_details?.name || session.customer_details?.name || null,
      items,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
