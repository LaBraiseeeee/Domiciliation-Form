// server.js
require('dotenv').config();        // Charge les variables d'environnement depuis .env
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Utilise ta clé API secrète

// Permet à Express de parser le JSON dans les requêtes POST
app.use(express.json());

// Route de test pour vérifier que le serveur tourne
app.get('/', (req, res) => {
  res.send('API Domiciliation OK ✅');
});

// Endpoint pour créer la souscription
app.post('/create-subscription', async (req, res) => {
  const { stripeToken, plan, email } = req.body;

  // Vérification du plan
  if (!['mensuel', 'annuel'].includes(plan)) {
    return res.status(400).json({ error: 'Plan non reconnu' });
  }

  try {
    // 1. Créer le client Stripe et y attacher la méthode de paiement
    const customer = await stripe.customers.create({
      email,
      payment_method: stripeToken,
      invoice_settings: {
        default_payment_method: stripeToken
      }
    });

    // 2. Déterminer le Price ID selon le plan sélectionné
    const priceId = plan === 'mensuel'
      ? 'prod_S8o9mYh0vS7GKt'   // Price ID mensuel
      : 'prod_S8oAAXO1DLC9sp';  // Price ID annuel

    // 3. Créer la souscription sur Stripe, en forçant le paiement immédiat
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      default_payment_method: stripeToken
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Erreur lors de la création de la souscription :', error);
    res.status(500).json({ error: error.message });
  }
});

// (Optionnel) Endpoint pour les webhooks Stripe
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // À compléter : validation et gestion des événements Stripe
  res.json({ received: true });
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
