// server.js
require('dotenv').config(); // Charge les variables d'environnement depuis .env

// Vérification du chargement des clés Stripe
console.log('▶️ STRIPE_SECRET_KEY loaded:', Boolean(process.env.STRIPE_SECRET_KEY));
console.log('▶️ STRIPE_WEBHOOK_SECRET loaded:', Boolean(process.env.STRIPE_WEBHOOK_SECRET));

const path = require('path');
const express = require('express');
const app = express();

// Initialise Stripe avec ta clé secrète
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Secret pour valider les webhooks
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ------- SERVIR LES FICHIERS STATIQUES -------
// On expose tout le contenu de /public (ton index.html, CSS, JS client, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ------- ROUTES WEBHOOK STRIPE -------
// On doit parser la requête en brut pour valider la signature
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Traite les événements qui t’intéressent
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('✅  Paiement récurrent réussi pour la souscription', invoice.subscription);
        // → ici tu peux mettre à jour ta base, envoyer un email, etc.
        break;
      }
      default:
        console.log(`ℹ️  Événement non géré : ${event.type}`);
    }

    // Répond OK à Stripe
    res.json({ received: true });
  }
);

// ------- PARSEUR JSON GLOBAL -------
// Tout le reste des endpoints reçoit du JSON déjà parsé
app.use(express.json());

// ------- ROUTES API -------

// Health check
app.get('/', (req, res) => {
  res.send('API Domiciliation OK ✅');
});

// Création de la souscription
app.post('/create-subscription', async (req, res) => {
  const { stripeToken, plan, email } = req.body;

  // Vérification du plan
  if (!['mensuel', 'annuel'].includes(plan)) {
    return res.status(400).json({ error: 'Plan non reconnu' });
  }

  try {
    // 1) Crée le client Stripe et attache la source
    const customer = await stripe.customers.create({
      email,
      source: stripeToken,
    });

    // 2) Détermine l'ID de prix selon le plan
    const priceId = plan === 'mensuel'
      ? 'price_1REmAAPs1z3kB9qHlghNeGeC'    // Price ID test mensuel
      : 'price_VOTRE_ID_ANNUEL_TEST';      // Remplace par ton Price ID test annuel

    // 3) Crée la souscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    // Retourne la souscription
    res.json({ subscription });
  } catch (error) {
    console.error('❌  Erreur lors de la création de la souscription :', error);
    res.status(500).json({ error: error.message });
  }
});

// ------- DÉMARRAGE DU SERVEUR -------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
