// --------------------------------------
// 0) FONCTION D’ENVOI VERS MAKE
// --------------------------------------
async function triggerMakeWebhook(payload) {
  const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/vhj6k18f27c9hz5c6s9uny4fiodppuxv';

  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Erreur Make (${res.status})`);
  }

  // Lire la réponse en plain-text
  const text = await res.text();
  console.log('Make webhook response raw:', text);

  // Essayer de parser en JSON si c'est du JSON, sinon retourner {}
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('Make response is not JSON:', err);
    return {};
  }
}

// --------------------------------------
// 1) NAVIGATION & PRÉCHARGEMENT IMAGE
// --------------------------------------

// Variables globales
let currentPage = 1;
let userEmail   = "";  // on stocke l'email saisi à l'étape 1

const formSteps        = document.querySelectorAll(".form-step");
const stepsBar         = document.getElementById("steps-bar");
const formContainer    = document.getElementById("form-container");
const addressImage     = document.getElementById("address-image");
const imagePlaceholder = document.getElementById("image-placeholder");
let imageLoaded        = false;

// Shimmer + preload
imagePlaceholder.classList.add("loading-shimmer");
function preloadImage() {
  const img = new Image();
  img.onload = () => {
    imageLoaded = true;
    addressImage.classList.add("loaded");
    imagePlaceholder.style.display = "none";
  };
  img.onerror = () => {
    console.error("Erreur lors du chargement de l'image");
    imagePlaceholder.innerHTML = "Impossible de charger l'image";
  };
  img.src = addressImage.src;
}
function isImageCached(src) {
  const img = new Image();
  img.src = src;
  return img.complete;
}

// Affichage de la page
function showPage(pageNumber) {
  formSteps.forEach(page => {
    page.classList.toggle("active", parseInt(page.dataset.page, 10) === pageNumber);
  });

  let progressStep = 1;
  if      (pageNumber === 1)                     progressStep = 1;
  else if (pageNumber === 2 || pageNumber === 3) progressStep = 2;
  else if (pageNumber === 4)                     progressStep = 3;
  else if (pageNumber === 5)                     progressStep = 4;
  else if (pageNumber === 6)                     progressStep = 5;

  stepsBar.querySelectorAll(".step-item").forEach(item => {
    const itemStep = parseInt(item.dataset.step, 10);
    item.classList.remove("active","completed");
    if      (itemStep < progressStep)   item.classList.add("completed");
    else if (itemStep === progressStep) item.classList.add("active");
  });

  if (progressStep < 3) {
    stepsBar.classList.replace("step-wide","step-narrow");
    formContainer.style.maxWidth = "500px";
  } else {
    stepsBar.classList.replace("step-narrow","step-wide");
    formContainer.style.maxWidth = "900px";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}
function goToPage(pageNumber) {
  currentPage = pageNumber;
  showPage(pageNumber);
}

document.addEventListener("DOMContentLoaded", () => {
  showPage(currentPage);
  preloadImage();
  if (isImageCached(addressImage.src)) {
    imageLoaded = true;
    addressImage.classList.add("loaded");
    imagePlaceholder.style.display = "none";
  }
});

// --------------------------------------
// 2) VALIDATION & NAVIGATION ENTRE ÉTAPES
// --------------------------------------

// Étape 1 : email + téléphone
const btnStep1   = document.getElementById("btn-step1");
const emailField = document.getElementById("email");
const phoneField = document.getElementById("telephone");
const errEmail   = document.getElementById("error-email");
const errPhone   = document.getElementById("error-telephone");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

btnStep1.addEventListener("click", () => {
  [errEmail, errPhone].forEach(e => { e.classList.remove("visible"); e.textContent = ""; });
  let valid = true;

  const eVal = emailField.value.trim();
  if (!eVal) {
    errEmail.textContent = "Ce champ est requis";
    errEmail.classList.add("visible");
    emailField.style.borderColor = "#e74c3c";
    valid = false;
  } else if (!emailRegex.test(eVal)) {
    errEmail.textContent = "Adresse e-mail invalide";
    errEmail.classList.add("visible");
    emailField.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    emailField.style.borderColor = "#ccc";
  }

  const pVal = phoneField.value.trim();
  if (!pVal) {
    errPhone.textContent = "Ce champ est requis";
    errPhone.classList.add("visible");
    phoneField.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    phoneField.style.borderColor = "#ccc";
  }

  if (valid) {
    userEmail = eVal;
    goToPage(2);
  }
});

// Étape 2 → 3
document.getElementById("btn-step2-part1").addEventListener("click", () => goToPage(3));

// Étape 3 : infos société
const btnStep3        = document.getElementById("btn-step3");
const formeJuridique  = document.getElementById("forme-juridique");
const nomSociete      = document.getElementById("nom-societe");
const radiosSocCree   = document.getElementsByName("societe-cree");
const sirenField      = document.getElementById("siren-field");
const numSiren        = document.getElementById("num-siren");
const microMsg        = document.getElementById("micro-entreprise-message");
const errForme        = document.getElementById("error-forme");
const errNomSoc       = document.getElementById("error-nomsociete");
const errSocCree      = document.getElementById("error-soccree");
const errSiren        = document.getElementById("error-siren");

formeJuridique.addEventListener("change", () => {
  microMsg.style.display = (formeJuridique.value === "Micro-entreprise") ? "block" : "none";
});

btnStep3.addEventListener("click", () => {
  [errForme, errNomSoc, errSocCree, errSiren].forEach(e => { e.classList.remove("visible"); e.textContent = ""; });
  let valid = true;

  if (!formeJuridique.value) {
    errForme.textContent = "Ce champ est requis";
    errForme.classList.add("visible");
    formeJuridique.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    formeJuridique.style.borderColor = "#ccc";
  }

  if (!nomSociete.value.trim()) {
    errNomSoc.textContent = "Ce champ est requis";
    errNomSoc.classList.add("visible");
    nomSociete.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    nomSociete.style.borderColor = "#ccc";
  }

  const chosen = Array.from(radiosSocCree).find(r => r.checked)?.value || "";
  if (!chosen) {
    errSocCree.textContent = "Ce champ est requis";
    errSocCree.classList.add("visible");
    valid = false;
  }

  if (chosen === "oui" && !numSiren.value.trim()) {
    errSiren.textContent = "Ce champ est requis";
    errSiren.classList.add("visible");
    numSiren.style.borderColor = "#e74c3c";
    valid = false;
  } else if (chosen === "oui") {
    numSiren.style.borderColor = "#ccc";
  }

  if (valid) goToPage(4);
});

radiosSocCree.forEach(radio => {
  radio.addEventListener("change", () => {
    sirenField.style.display = (radio.value === "oui" && radio.checked) ? "block" : "none";
  });
});

// Étape 4 : adresse de réexpédition
const btnStep4          = document.getElementById("btn-step4");
const adressePrincipale = document.getElementById("adresse-principale");
const errAdresse        = document.getElementById("error-message-adresse");

btnStep4.addEventListener("click", () => {
  let valid = true;
  if (!adressePrincipale.value.trim()) {
    errAdresse.textContent = "Ce champ est requis";
    errAdresse.classList.add("visible");
    adressePrincipale.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    errAdresse.classList.remove("visible");
    adressePrincipale.style.borderColor = "#ddd";
  }
  if (valid) goToPage(5);
});

// Sélection fréquence page 5
const paymentOptions = document.querySelectorAll("#payment-options-container .frequency-option");
paymentOptions.forEach(opt => {
  opt.addEventListener("click", function() {
    paymentOptions.forEach(o => o.classList.remove("selected"));
    this.classList.add("selected");

    const ht  = this.dataset.paymentPriceHt;
    const ttc = this.dataset.paymentPriceTtc;
    const txt = this.querySelector(".frequency-title").innerText.toLowerCase();
    const lbl = txt.includes("annuel") ? "ANNUEL" : "MENSUEL";

    document.getElementById("total-label-ht-final").innerText  = `TOTAL ${lbl} HT`;
    document.getElementById("total-label-ttc-final").innerText = `TOTAL ${lbl} TTC`;
    document.getElementById("total-ht-final").innerText        = parseFloat(ht).toFixed(2).replace(".", ",") + " €";
    document.getElementById("total-ttc-final").innerText       = parseFloat(ttc).toFixed(2).replace(".", ",") + " €";
    document.getElementById("recap-domiciliation-final").innerText =
      parseFloat(ht).toFixed(2).replace(".", ",") + " €";
  });
});

// --------------------------------------
// 3) INTÉGRATION STRIPE (mode TEST) + WEBHOOKS
// --------------------------------------
const stripe   = Stripe("pk_test_51QfLJWPs1z3kB9qHrbfhmcDseTIn6dvRXJSi71Od69vd1aDEFsb8HWn42gB4gxCdi6DccsccrDXqEvPmiakxdGEQ00OVGdQkcQ");
const elements = stripe.elements();
const style    = {
  base: {
    color: "#32325d",
    fontFamily: "Nunito, sans-serif",
    fontSize: "16px",
    "::placeholder": { color: "#ccc" }
  },
  invalid: { color: "#e74c3c" }
};

const cardNumber = elements.create("cardNumber", { style });
const cardExpiry = elements.create("cardExpiry", { style });
const cardCvc    = elements.create("cardCvc",    { style });

cardNumber.mount("#card-number-element");
cardExpiry.mount("#card-expiry-element");
cardCvc.mount("#card-cvc-element");

function handleCardError(event) {
  document.getElementById("card-errors").textContent = event.error ? event.error.message : "";
}
cardNumber.on("change", handleCardError);
cardExpiry.on("change", handleCardError);
cardCvc.on("change", handleCardError);

document.getElementById("btn-step5").addEventListener("click", async () => {
  // 1) Création du token Stripe
  const country = document.getElementById("card-country").value || "FR";
  const { token, error } = await stripe.createToken(cardNumber, {
    name: "Nom Sur La Carte",
    address_country: country
  });
  if (error) {
    document.getElementById("card-errors").textContent = error.message;
    return;
  }

  // 2) Récupère l’ID du tarif sélectionné + type d'abonnement
  const selectedElem = document.querySelector("#payment-options-container .frequency-option.selected");
  const priceId      = selectedElem.dataset.priceId;
  const clientEmail  = userEmail;
  const freqText     = selectedElem.querySelector('.frequency-title').innerText.toLowerCase();
  const abonnement   = freqText.includes('annuel') ? 'Annuelle' : 'Mensuelle';

  try {
    // 3) Crée la souscription Stripe
    const res  = await fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripeToken: token.id, priceId, email: clientEmail })
    });
    const data = await res.json();
    if (!data.clientSecret) throw new Error(data.error || "Pas de clientSecret renvoyé");

    // 4) Confirme le paiement (3D Secure)
    const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
    if (confirmError) throw new Error("Erreur 3D Secure : " + confirmError.message);

    // 5) Passe à l’étape 6 + affiche loader
    goToPage(6);
    document.getElementById("contract-loader").style.display   = "block";
    document.getElementById("contract-preview").style.display = "none";

    // 6) Prépare le payload complet
    const payload = {
      subscriptionId: data.subscriptionId,
      email:          document.getElementById("email").value.trim(),
      telephone:      document.getElementById("telephone").value.trim(),
      formeJuridique: document.getElementById("forme-juridique").value,
      nomSociete:     document.getElementById("nom-societe").value.trim(),
      societeCree:    document.querySelector("input[name='societe-cree']:checked")?.value || "",
      numSiren:       document.getElementById("num-siren").value.trim(),
      adresseReexp:   document.getElementById("adresse-principale").value.trim(),
      complementAdresse: document.getElementById("complement-adresse").value.trim(),
      priceId,
      abonnement
    };

    // 7) Envoie vers Make et récupère pdf_url & sign_url
    const { pdf_url, sign_url } = await triggerMakeWebhook(payload);

    // 8) Masque loader, injecte PDF et configure le bouton signer
    document.getElementById("contract-loader").style.display   = "none";
    if (pdf_url)  document.getElementById("contract-iframe").src = pdf_url;
    if (sign_url) document.getElementById("btn-sign").onclick     = () => window.location.href = sign_url;
    document.getElementById("contract-preview").style.display     = "block";
  } catch (err) {
    alert(`Erreur Make : ${err.message}`);
  }
});
