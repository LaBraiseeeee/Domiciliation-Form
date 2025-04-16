// server.js
require('dotenv').config();        // Charge les variables d'environnement depuis .env
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Utilise ta clé API secrète

// Permet à Express de parser le JSON dans les requêtes POST
app.use(express.json());

// Endpoint pour créer la souscription
app.post('/create-subscription', async (req, res) => {
  // On s'attend à recevoir { stripeToken, plan, email } depuis ton code client
  const { stripeToken, plan, email } = req.body;

  try {
    // 1. Créer le client Stripe et y attacher la carte
    const customer = await stripe.customers.create({
      source: stripeToken,
      email: email
    });

    // 2. Déterminer le Price ID selon le plan sélectionné
    let priceId;
    if (plan === 'mensuel') {
      priceId = 'price_mensuel_id';   // Remplace par ton Price ID mensuel
    } else if (plan === 'annuel') {
      priceId = 'price_annuel_id';    // Remplace par ton Price ID annuel
    } else {
      throw new Error('Plan non reconnu');
    }

    // 3. Créer la souscription sur Stripe
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent']
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Erreur lors de la création de la souscription :', error);
    res.status(500).json({ error: error.message });
  }
});

// (Optionnel) Endpoint pour les webhooks Stripe
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // Exemple de gestion de webhook, à compléter plus tard si nécessaire
  res.json({ received: true });
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
