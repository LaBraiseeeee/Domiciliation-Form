// --------------------------------------
// CONFIGURATION GLOBALE
// --------------------------------------
const STRIPE_PUBLIC_KEY = 'pk_test_51QfLJWPs1z3kB9qHrbfhmcDseTIn6dvRXJSi71Od69vd1aDEFsb8HWn42gB4gxCdi6DccsccrDXqEvPmiakxdGEQ00OVGdQkcQ';

// --------------------------------------
// 0) FONCTION DE CRÉATION DU CONTRAT
// --------------------------------------
async function createContract({ name, email }) {
  // Validation des champs
  if (!name || !email) {
    throw new Error("Le nom et l'email du signataire sont requis");
  }

  // Appel au serveur qui relaie vers l’API eSignatures
  const res = await fetch('/createContract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });
  if (!res.ok) {
    let errBody;
    try { errBody = await res.json(); }
    catch { errBody = await res.text(); }
    throw new Error(`eSignatures (${res.status}): ${JSON.stringify(errBody)}`);
  }
  return res.json(); // { sign_url }
}

// --------------------------------------
// 1) NAVIGATION, PRÉCHARGEMENT IMAGE & INIT
// --------------------------------------
let currentPage     = 1;
let userEmail       = '';
const formSteps     = document.querySelectorAll('.form-step');
const stepsBar      = document.getElementById('steps-bar');
const formContainer = document.getElementById('form-container');
const addressImage  = document.getElementById('address-image');
const imagePlaceholder = document.getElementById('image-placeholder');
const clientEmailField  = document.getElementById('clientEmail');
const companyNameField  = document.getElementById('companyName');

function preloadImage() {
  imagePlaceholder.classList.add('loading-shimmer');
  const img = new Image();
  img.onload  = () => {
    addressImage.classList.add('loaded');
    imagePlaceholder.style.display = 'none';
  };
  img.onerror = () => {
    imagePlaceholder.innerHTML = "Impossible de charger l'image";
  };
  img.src = addressImage.src;
}

function isImageCached(src) {
  const img = new Image();
  img.src = src;
  return img.complete;
}

function adjustFormWidth() {
  const w = window.innerWidth;
  if (w <= 600) {
    formContainer.style.maxWidth = '95%';
  } else {
    const step = currentPage === 1 ? 1
               : currentPage <= 3 ? 2
               : currentPage === 4 ? 3
               : currentPage === 5 ? 4
                                   : 5;
    formContainer.style.maxWidth = step < 3 ? '500px' : (w < 950 ? '95%' : '900px');
  }
}

function showPage(pageNumber) {
  currentPage = pageNumber;
  formSteps.forEach(page => {
    page.classList.toggle('active', parseInt(page.dataset.page, 10) === pageNumber);
  });

  const progressStep = currentPage === 1 ? 1
                      : currentPage <= 3 ? 2
                      : currentPage === 4 ? 3
                      : currentPage === 5 ? 4
                                           : 5;

  stepsBar.querySelectorAll('.step-item').forEach(item => {
    const s = parseInt(item.dataset.step, 10);
    item.classList.remove('active','completed');
    if (s < progressStep)       item.classList.add('completed');
    else if (s === progressStep) item.classList.add('active');
  });

  stepsBar.classList.toggle('step-narrow', progressStep < 3);
  stepsBar.classList.toggle('step-wide',  progressStep >= 3);

  adjustFormWidth();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPage(pageNumber) {
  showPage(pageNumber);
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialisation
  preloadImage();
  if (isImageCached(addressImage.src)) {
    addressImage.classList.add('loaded');
    imagePlaceholder.style.display = 'none';
  }
  showPage(currentPage);
  window.addEventListener('resize', adjustFormWidth);
});

// --------------------------------------
// 2) VALIDATION & NAVIGATION ENTRE ÉTAPES
// --------------------------------------

// Étape 1 : Email + Téléphone
const btnStep1         = document.getElementById('btn-step1');
const phoneField       = document.getElementById('telephone');
const errEmail         = document.getElementById('error-email');
const errPhone         = document.getElementById('error-telephone');
const emailRe          = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

btnStep1.addEventListener('click', () => {
  errEmail.classList.remove('visible'); errPhone.classList.remove('visible');
  errEmail.textContent = ''; errPhone.textContent = '';
  let valid = true;

  const eVal = clientEmailField.value.trim();
  if (!eVal) {
    errEmail.textContent = 'Ce champ est requis';
    errEmail.classList.add('visible');
    clientEmailField.style.borderColor = '#e74c3c';
    valid = false;
  } else if (!emailRe.test(eVal)) {
    errEmail.textContent = 'Adresse e-mail invalide';
    errEmail.classList.add('visible');
    clientEmailField.style.borderColor = '#e74c3c';
    valid = false;
  } else {
    clientEmailField.style.borderColor = '#ccc';
  }

  const pVal = phoneField.value.trim();
  if (!pVal) {
    errPhone.textContent = 'Ce champ est requis';
    errPhone.classList.add('visible');
    phoneField.style.borderColor = '#e74c3c';
    valid = false;
  } else {
    phoneField.style.borderColor = '#ccc';
  }

  if (valid) {
    userEmail = eVal;
    goToPage(2);
  }
});

// Étape 2 → 3
document.getElementById('btn-step2-part1')
        .addEventListener('click', () => goToPage(3));

// Étape 3 : Infos société
const btnStep3      = document.getElementById('btn-step3');
const formeSelect   = document.getElementById('forme-juridique');
const radiosSocCree = document.getElementsByName('societe-cree');
const errForme      = document.getElementById('error-forme');
const errNomSoc     = document.getElementById('error-nomsociete');
const errSociCree   = document.getElementById('error-soccree');
const errSiren      = document.getElementById('error-siren');
const microMsg      = document.getElementById('micro-entreprise-message');

formeSelect.addEventListener('change', () => {
  microMsg.style.display = formeSelect.value === 'Micro-entreprise' ? 'block' : 'none';
});

btnStep3.addEventListener('click', () => {
  [errForme, errNomSoc, errSociCree, errSiren].forEach(e => {
    e.classList.remove('visible'); e.textContent = '';
  });
  let valid = true;

  if (!formeSelect.value) {
    errForme.textContent = 'Ce champ est requis'; errForme.classList.add('visible');
    valid = false;
  }
  if (!companyNameField.value.trim()) {
    errNomSoc.textContent = 'Ce champ est requis'; errNomSoc.classList.add('visible');
    valid = false;
  }
  const chosen = Array.from(radiosSocCree).find(r => r.checked)?.value || '';
  if (!chosen) {
    errSociCree.textContent = 'Ce champ est requis'; errSociCree.classList.add('visible');
    valid = false;
  }
  if (chosen === 'oui' && !document.getElementById('num-siren').value.trim()) {
    errSiren.textContent = 'Ce champ est requis'; errSiren.classList.add('visible');
    valid = false;
  }

  if (valid) goToPage(4);
});

// Étape 4 : Adresse de réexpédition
document.getElementById('btn-step4').addEventListener('click', () => {
  const errAddr = document.getElementById('error-message-adresse');
  errAddr.classList.remove('visible'); errAddr.textContent = '';
  if (!document.getElementById('adresse-principale').value.trim()) {
    errAddr.textContent = 'Ce champ est requis'; errAddr.classList.add('visible');
  } else {
    goToPage(5);
  }
});

// Étape 5 : Choix de la fréquence
document.querySelectorAll('#payment-options-container .frequency-option')
  .forEach(opt => opt.addEventListener('click', function() {
    document.querySelectorAll('#payment-options-container .frequency-option')
            .forEach(o => o.classList.remove('selected'));
    this.classList.add('selected');
    const ht  = this.dataset.paymentPriceHt;
    const ttc = this.dataset.paymentPriceTtc;
    const txt = this.querySelector('.frequency-title').innerText.toLowerCase();
    const lbl = txt.includes('annuel') ? 'ANNUEL' : 'MENSUEL';
    document.getElementById('total-label-ht-final').innerText  = `TOTAL ${lbl} HT`;
    document.getElementById('total-label-ttc-final').innerText = `TOTAL ${lbl} TTC`;
    document.getElementById('total-ht-final').innerText        = parseFloat(ht).toFixed(2).replace('.',',')+' €';
    document.getElementById('total-ttc-final').innerText       = parseFloat(ttc).toFixed(2).replace('.',',')+' €';
}));

// --------------------------------------
// 3) INTÉGRATION STRIPE
// --------------------------------------
const stripe   = Stripe(STRIPE_PUBLIC_KEY);
const elements = stripe.elements();
const style    = {
  base:   { color:"#32325d", fontFamily:"Nunito, sans-serif", fontSize:"16px", "::placeholder":{ color:"#ccc" } },
  invalid:{ color:"#e74c3c" }
};
const cardNumber = elements.create("cardNumber",{ style });
const cardExpiry = elements.create("cardExpiry",{ style });
const cardCvc    = elements.create("cardCvc",{ style });
cardNumber.mount("#card-number-element");
cardExpiry.mount("#card-expiry-element");
cardCvc.mount("#card-cvc-element");
cardNumber.on("change", handleCardError);
cardExpiry.on("change", handleCardError);
cardCvc.on("change", handleCardError);

function handleCardError(e) {
  document.getElementById("card-errors").textContent = e.error ? e.error.message : "";
}

// --------------------------------------
// 4) BOUTON PAIEMENT (Étape 5 → 6 + Contrat)
// --------------------------------------
document.getElementById("payButton").addEventListener("click", async event => {
  event.preventDefault(); // empêche le rechargement

  try {
    // 1) Création du token Stripe
    const country = document.getElementById("card-country").value || "FR";
    const { token, error: tokErr } = await stripe.createToken(cardNumber, {
      name:            "Nom Sur La Carte",
      address_country: country
    });
    if (tokErr) throw new Error(tokErr.message);

    // 2) Création de la souscription
    const sel       = document.querySelector("#payment-options-container .frequency-option.selected");
    const priceId   = sel.dataset.priceId;
    const labelText = sel.querySelector('.frequency-title').innerText.toLowerCase();

    const subRes = await fetch("/api/create-subscription", {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify({
        stripeToken: token.id,
        priceId:     priceId,
        email:       userEmail
      })
    });
    const subData = await subRes.json();
    if (!subData.clientSecret) throw new Error(subData.error || "Pas de clientSecret renvoyé");

    // 3D Secure si nécessaire
    const { error: confirmErr } = await stripe.confirmCardPayment(subData.clientSecret);
    if (confirmErr) throw new Error("Erreur 3D Secure : " + confirmErr.message);

    // Passage à l'étape 6 + loader
    goToPage(6);
    document.getElementById("contract-loader").style.display = "block";
    document.getElementById("contractStep").style.display   = "none";

    // 5) Création du contrat & intégration embed
    const { sign_url } = await createContract({
      name:  companyNameField.value.trim(),
      email: userEmail
    });

    // Affichage de l'iframe de signature
    document.getElementById("contract-loader").style.display = "none";
    document.getElementById("contractIframe").src            = sign_url + '?embedded=yes';
    document.getElementById("contractStep").style.display   = "block";

  } catch (err) {
    console.error("Erreur Paiement/Signature:", err);
    alert(`Erreur : ${err.message}`);
  }
});
