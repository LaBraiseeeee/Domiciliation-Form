// server.js
require('dotenv').config();        // Charge les variables d'environnement depuis .env
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Utilise ta clé secrète de test

app.use(express.json()); // Pour parser le JSON des requêtes

// Route de santé
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
    // 1) Créer le client et attacher la méthode de paiement
    const customer = await stripe.customers.create({
      email,
      payment_method: stripeToken,
      invoice_settings: {
        default_payment_method: stripeToken
      }
    });

    // 2) Choisir l'ID de tarif (Price) de test
    const priceId = plan === 'mensuel'
      ? 'price_1REmAAPs1z3kB9qHlghNeGeC'   // Price ID test pour abonnement mensuel
      : 'price_VOTRE_ID_ANNUEL_TEST';      // Remplace par ton Price ID test pour abonnement annuel

    // 3) Créer la souscription et forcer le paiement immédiat
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      default_payment_method: stripeToken
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Erreur création souscription :', error);
    res.status(500).json({ error: error.message });
  }
});

// (Optionnel) Endpoint pour les webhooks Stripe
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // À compléter pour gérer les événements Stripe si besoin
  res.json({ received: true });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
