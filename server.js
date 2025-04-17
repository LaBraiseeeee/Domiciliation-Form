// server.js
require('dotenv').config(); // charge .env

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const stripeLib  = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// 🚨 Affiche la VALEUR brute de tes ENV pour debug
console.log('▶️ STRIPE_SECRET_KEY     =', process.env.STRIPE_SECRET_KEY);
console.log('▶️ STRIPE_WEBHOOK_SECRET =', process.env.STRIPE_WEBHOOK_SECRET);
console.log('▶️ PRICE_ID_MENSUEL      =', process.env.PRICE_ID_MENSUEL);
console.log('▶️ PRICE_ID_ANNUEL       =', process.env.PRICE_ID_ANNUEL);

// 1) ROUTE WEBHOOK (body brut pour verifier la signature)
app.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripeLib.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️ Webhook signature invalid:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // traite les events utiles
    switch (event.type) {
      case 'invoice.payment_succeeded':
        console.log('✅ Paiement OK pour subscription', event.data.object.subscription);
        break;
      case 'invoice.payment_failed':
        console.log('❌ Paiement échoué pour subscription', event.data.object.subscription);
        break;
      default:
        console.log('ℹ️ Événement non géré :', event.type);
    }

    res.json({ received: true });
  }
);

// 2) JSON parser pour le reste
app.use(express.json());

// 3) Sert tes fichiers statiques (public/index.html, css/, js/)
app.use(express.static(path.join(__dirname, 'public')));

// 4) ROUTES API

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// création d’abonnement avec SCA
app.post('/api/create-subscription', async (req, res) => {
  const { stripeToken, plan, email } = req.body;
  if (!stripeToken || !plan || !email) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }

  // mappe plan → priceId depuis tes ENV
  const priceId = plan === 'mensuel'
    ? process.env.PRICE_ID_MENSUEL
    : process.env.PRICE_ID_ANNUEL;

  if (!priceId) {
    return res.status(400).json({ error: 'Plan invalide ou non configuré.' });
  }

  try {
    // 1) création customer et attache la carte
    const customer = await stripeLib.customers.create({
      email,
      source: stripeToken
    });

    // 2) création de la subscription en mode incomplete pour 3D Secure
    const subscription = await stripeLib.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    const pi = subscription.latest_invoice.payment_intent;

    // 3) renvoie clientSecret + subscriptionId
    res.json({
      subscriptionId: subscription.id,
      clientSecret: pi.client_secret,
      status: subscription.status
    });
  } catch (err) {
    console.error('❌ Erreur création subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5) Fallback SPA : toutes les routes non-API redirigent vers index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6) Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
