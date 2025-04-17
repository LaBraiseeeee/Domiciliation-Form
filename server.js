// server.js
require('dotenv').config();        // Charge les variables d'environnement depuis .env
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Ta clé secrète Stripe (mode test)

// Parse le JSON des requêtes
app.use(express.json());

// Route de santé pour vérifier que le serveur tourne
app.get('/', (req, res) => {
  res.send('API Domiciliation OK ✅');
});

// Endpoint pour créer la souscription
app.post('/create-subscription', async (req, res) => {
  const { stripeToken, plan, email } = req.body;

  // Vérifie que le plan est valide
  if (!['mensuel', 'annuel'].includes(plan)) {
    return res.status(400).json({ error: 'Plan non reconnu' });
  }

  try {
    // 1) Crée le client et attache la source (tok_…)
    const customer = await stripe.customers.create({
      email,
      source: stripeToken
    });

    // 2) Sélectionne l'ID de prix de test selon le plan
    const priceId = plan === 'mensuel'
      ? 'price_1REmAAPs1z3kB9qHlghNeGeC'    // Price ID test pour abonnement mensuel
      : 'price_VOTRE_ID_ANNUEL_TEST';      // Remplace par ton Price ID test pour abonnement annuel

    // 3) Crée la souscription sur Stripe
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent']
    });

    // Retourne l'objet subscription
    res.json({ subscription });
  } catch (error) {
    console.error('Erreur lors de la création de la souscription :', error);
    res.status(500).json({ error: error.message });
  }
});

// (Optionnel) Endpoint pour les webhooks Stripe
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // À compléter : valider le signature et traiter les events Stripe
  res.json({ received: true });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
