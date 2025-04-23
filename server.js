// server.js
require('dotenv').config(); // charge .env
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');                                // ← IMPORT d'axios pour l’API eSignatures
const stripeLib = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// 🚨 DEBUG ENV
console.log('▶️ STRIPE_SECRET_KEY     =', process.env.STRIPE_SECRET_KEY);
console.log('▶️ STRIPE_WEBHOOK_SECRET =', process.env.STRIPE_WEBHOOK_SECRET);
console.log('▶️ PRICE_ID_MENSUEL      =', process.env.PRICE_ID_MENSUEL);
console.log('▶️ PRICE_ID_ANNUEL       =', process.env.PRICE_ID_ANNUEL);
console.log('▶️ ESIG_TEMPLATE_ID      =', process.env.ESIG_TEMPLATE_ID); // ← DEBUG ESIG
console.log('▶️ ESIG_TOKEN            =', process.env.ESIG_TOKEN);       // ← DEBUG ESIG

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
    // Traite les events utiles
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

// 3) ROUTES API EXISTANTES

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

// ─── NOUVELLE ROUTE POUR eSignature ───
app.post('/api/prepare-esignature', async (req, res) => {
  const {
    subscriptionId, email, telephone,
    formeJuridique, nomSociete, societeCree,
    numSiren, adresseReexp, complementAdresse,
    priceId, abonnement
  } = req.body;

  const templateId = process.env.ESIG_TEMPLATE_ID;
  const token      = process.env.ESIG_TOKEN;
  if (!templateId || !token) {
    return res.status(500).json({ error: 'Variables d’environnement ESIG manquantes.' });
  }

  try {
    const esigRes = await axios.post(
      'https://api.esignatures.com/v1/signature_requests',
      {
        template_id: templateId,
        signers: [{
          email,
          name: nomSociete,
          role: 'Client'
        }],
        custom_fields: {
          subscriptionId,
          telephone,
          formeJuridique,
          societeCree,
          numSiren,
          adresseReexp,
          complementAdresse,
          priceId,
          abonnement
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json'
        }
      }
    );

    const data = esigRes.data;
    res.json({
      pdf_url:  data.pdf_url,
      sign_url: data.sign_url
    });
  } catch (err) {
    console.error('❌ eSignature API error:', err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
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
