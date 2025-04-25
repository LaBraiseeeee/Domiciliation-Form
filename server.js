// server.js
require('dotenv').config(); // charge .env

const express = require('express');
const path    = require('path');
const fetch   = require('node-fetch');
const stripeLib = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware JSON pour toutes les routes (sauf webhook Stripe)
app.use(express.json());

// --------------------------------------
// 1) Webhook Stripe (signature raw pour vérif)
// --------------------------------------
const bodyParser = require('body-parser');
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
    // Logs basiques
    if (event.type === 'invoice.payment_succeeded') {
      console.log('✅ Paiement OK pour subscription', event.data.object.subscription);
    } else if (event.type === 'invoice.payment_failed') {
      console.log('❌ Paiement échoué pour subscription', event.data.object.subscription);
    } else {
      console.log('ℹ️ Événement non géré :', event.type);
    }
    res.json({ received: true });
  }
);

// --------------------------------------
// 2) Route Stripe : création d’abonnement
// --------------------------------------
app.post('/api/create-subscription', async (req, res) => {
  const { stripeToken, priceId, email } = req.body;
  if (!stripeToken || !priceId || !email) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }
  const allowed = [process.env.PRICE_ID_MENSUEL, process.env.PRICE_ID_ANNUEL];
  if (!allowed.includes(priceId)) {
    return res.status(400).json({ error: 'priceId invalide ou non configuré.' });
  }
  try {
    // Création du customer
    const customer = await stripeLib.customers.create({
      email,
      source: stripeToken
    });
    // Création de l’abonnement (SCA)
    const subscription = await stripeLib.subscriptions.create({
      customer: customer.id,
      items:    [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand:   ['latest_invoice.payment_intent']
    });
    const pi = subscription.latest_invoice.payment_intent;
    res.json({
      subscriptionId: subscription.id,
      clientSecret:   pi.client_secret,
      status:         subscription.status
    });
  } catch (err) {
    console.error('❌ Erreur création subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------
// 3) Route eSignatures : création contrat
// --------------------------------------
app.post('/createContract', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const token      = process.env.ESIG_TOKEN;
  const templateId = process.env.ESIG_TEMPLATE_ID;
  if (!token || !templateId) {
    console.error('❌ ESIG_TOKEN or ESIG_TEMPLATE_ID missing');
    return res.status(500).json({ error: 'ESIG config missing' });
  }

  try {
    const payload = {
      template_id: templateId,
      test:        'yes',
      signers: [{
        name:  name,
        email: email,
        // disable automatic email/SMS notification (we embed the page)
        signature_request_delivery_methods: []
      }]
    };

    // Appel à l'API eSignatures
    const apiUrl = `https://esignatures.com/api/contracts?token=${token}`;
    const apiRes = await fetch(apiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!apiRes.ok) {
      const errText = await apiRes.text();
      throw new Error(`eSignatures create status ${apiRes.status}: ${errText}`);
    }
    const json = await apiRes.json();
    // Récupère l'URL de la page de signature pour le premier signataire
    const signUrl = json.data.contract.signers[0].sign_page_url;
    return res.json({ sign_url: signUrl });

  } catch (err) {
    console.error('❌ eSignatures API error:', err.message || err);
    res.status(500).json({ error: 'Contract creation failed' });
  }
});

// --------------------------------------
// 4) Fichiers statiques & SPA fallback
// --------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------------------------------
// 5) Démarrage du serveur
// --------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
