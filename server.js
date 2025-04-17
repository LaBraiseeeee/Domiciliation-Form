// server.js
require('dotenv').config();        // Charge les variables d'environnement depuis .env
const express = require('express');
const app = express();

// Initialise Stripe avec ta clé secrète de test (définie dans STRIPE_SECRET_KEY)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Clé publique test à utiliser côté client (Stripe.js)
// pk_test_51QfLJWPs1z3kB9qHrbfhmcDseTIn6dvRXJSi71Od69vd1aDEFsb8HWn42gB4gxCdi6DccsccrDXqEvPmiakxdGEQ00OVGdQkcQ

app.use(express.json()); // pour parser le JSON des requêtes

// Route de santé
app.get('/', (req, res) => {
  res.send('API Domiciliation OK ✅');
});

// Création de la souscription
app.post('/create-subscription', async (req, res) => {
  const { stripeToken, plan, email } = req.body;

  if (!['mensuel', 'annuel'].includes(plan)) {
    return res.status(400).json({ error: 'Plan non reconnu' });
  }

  try {
    // 1) Crée le client et attache la méthode de paiement
    const customer = await stripe.customers.create({
      email,
      payment_method: stripeToken,
      invoice_settings: {
        default_payment_method: stripeToken
      }
    });

    // 2) Choix du Price ID de test
    const priceId = plan === 'mensuel'
      ? 'prod_S94I7kzRbg36vt'   // Domiciliation mensuelle (test)
      : 'prod_S94JbACTYpJSYJ'; // Domiciliation annuelle (test)

    // 3) Crée la souscription (paiement immédiat)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      default_payment_method: stripeToken
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Erreur création souscription :', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook Stripe (optionnel)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // À compléter si tu veux gérer les events Stripe
  res.json({ received: true });
});

// Démarrage
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
