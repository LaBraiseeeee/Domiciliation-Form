// server.js
require('dotenv').config(); // charge .env

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');                       // on utilise node-fetch
const { createProxyMiddleware } = require('http-proxy-middleware');
const stripeLib = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// 🚨 DEBUG ENV
console.log('▶️ STRIPE_SECRET_KEY     =', process.env.STRIPE_SECRET_KEY);
console.log('▶️ STRIPE_WEBHOOK_SECRET =', process.env.STRIPE_WEBHOOK_SECRET);
console.log('▶️ PRICE_ID_MENSUEL      =', process.env.PRICE_ID_MENSUEL);
console.log('▶️ PRICE_ID_ANNUEL       =', process.env.PRICE_ID_ANNUEL);
console.log('▶️ ESIG_TEMPLATE_ID      =', process.env.ESIG_TEMPLATE_ID);
console.log('▶️ ESIG_TOKEN            =', process.env.ESIG_TOKEN);

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

// 2) JSON parser pour le reste des routes API
app.use(express.json());

// 2b) PROXY n8n local → /webhook-test → localhost:5678
app.use(
  '/webhook-test',
  createProxyMiddleware({
    target: 'http://localhost:5678',
    changeOrigin: true,
    secure: false,
    pathRewrite: { '^/webhook-test': '/webhook-test' }
  })
);

// 3) ROUTES API

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// création d'abonnement avec SCA
app.post('/api/create-subscription', async (req, res) => {
  console.log('📥 Payload /create-subscription:', req.body);
  const { stripeToken, priceId, email } = req.body;
  if (!stripeToken || !priceId || !email) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }
  const allowed = [process.env.PRICE_ID_MENSUEL, process.env.PRICE_ID_ANNUEL];
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

// ─── ROUTE POUR eSignature via node-fetch ───
app.post('/api/create-contract', async (req, res) => {
  // On récupère désormais tous les champs dynamiques du front
  const {
    nomSociete,
    email,
    subscriptionId,
    abonnement,
    placeholder_fields = [],
    signer_fields = []
  } = req.body;

  const token      = process.env.ESIG_TOKEN;
  const templateId = process.env.ESIG_TEMPLATE_ID;

  if (!token || !templateId) {
    return res.status(500).json({ error: 'Variables d’environnement ESIG manquantes.' });
  }

  try {
    // Construction du payload complet pour l'API eSignatures
    const apiRes = await fetch(`https://esignatures.com/api/contracts?token=${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id:        templateId,
        test:               'yes',
        signers: [{
          name:         nomSociete,
          email,
          redirect_url: 'https://ton-site.com/merci'
        }],
        placeholder_fields,
        signer_fields
      })
    });
    if (!apiRes.ok) throw new Error(`eSignatures API status ${apiRes.status}`);
    const json = await apiRes.json();
    const contract = json.data.contract;

    // On renvoie les URLs pour le front
    res.json({
      pdf_url:  contract.contract_pdf_url,
      sign_url: contract.signers[0].sign_page_url
    });
  } catch (err) {
    console.error('❌ eSignature API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4) Sert tes fichiers statiques (public/)
app.use(express.static(path.join(__dirname, 'public')));

// 5) Fallback SPA : toutes les routes non-API redirigent vers index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6) Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
