// server.js
require('dotenv').config(); // charge .env

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');                      // ← ajouté pour eSignatures
const { createProxyMiddleware } = require('http-proxy-middleware');
const stripeLib = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// 🚨 Affiche la VALEUR brute de tes ENV pour debug
console.log('▶️ STRIPE_SECRET_KEY     =', process.env.STRIPE_SECRET_KEY);
console.log('▶️ STRIPE_WEBHOOK_SECRET =', process.env.STRIPE_WEBHOOK_SECRET);
console.log('▶️ PRICE_ID_MENSUEL      =', process.env.PRICE_ID_MENSUEL);
console.log('▶️ PRICE_ID_ANNUEL       =', process.env.PRICE_ID_ANNUEL);
console.log('▶️ ESIG_TOKEN            =', process.env.ESIG_TOKEN);
console.log('▶️ ESIG_TEMPLATE_ID      =', process.env.ESIG_TEMPLATE_ID);

// 1) ROUTE WEBHOOK Stripe (body brut pour vérifier la signature)
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

// 2b) PROXY n8n local → toutes les requêtes /webhook-test passent vers localhost:5678
app.use(
  '/webhook-test',
  createProxyMiddleware({
    target: 'http://localhost:5678',
    changeOrigin: true,
    secure: false,
    pathRewrite: { '^/webhook-test': '/webhook-test' }
  })
);

// 3) Sert tes fichiers statiques (public/index.html, css/, js/)
app.use(express.static(path.join(__dirname, 'public')));

// 4) ROUTES API

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// création d’abonnement avec SCA
app.post('/api/create-subscription', async (req, res) => {
  console.log('📥 Payload /create-subscription:', req.body);

  const { stripeToken, priceId, email } = req.body;
  if (!stripeToken || !priceId || !email) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }

  const allowed = [
    process.env.PRICE_ID_MENSUEL,
    process.env.PRICE_ID_ANNUEL
  ];
  if (!allowed.includes(priceId)) {
    return res.status(400).json({ error: 'priceId invalide ou non configuré.' });
  }

  try {
    const customer = await stripeLib.customers.create({ email, source: stripeToken });
    const subscription = await stripeLib.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    const pi = subscription.latest_invoice.payment_intent;

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

// ——————————————————————————————
// nouv. endpoint pour eSignatures
// ——————————————————————————————
app.post('/api/create-contract', async (req, res) => {
  const { nomSociete, email, subscriptionId, abonnement } = req.body;
  const payload = {
    token:       process.env.ESIG_TOKEN,
    template_id: process.env.ESIG_TEMPLATE_ID,
    test:        'yes',
    signers: [{
      name:         nomSociete,
      email,
      redirect_url: 'https://ton-site.com/merci'
    }]
  };

  try {
    const apiRes = await fetch('https://esignatures.com/api/contracts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!apiRes.ok) throw new Error(`Status ${apiRes.status}`);
    const json = await apiRes.json();
    const contract = json.data.contract;
    res.json({
      pdf_url:  contract.pdf_url,
      sign_url: contract.signers[0].sign_page_url
    });
  } catch (err) {
    console.error('❌ Erreur eSignatures:', err);
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
