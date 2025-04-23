// --------------------------------------
// 0) FONCTION DE CRÉATION DU CONTRAT eSignatures
// --------------------------------------
async function createContract(payload) {
  const res = await fetch('/api/create-contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`eSignatures (${res.status})`);
  }
  return res.json(); // { pdf_url, sign_url }
}

// --------------------------------------
// 1) NAVIGATION & PRÉCHARGEMENT IMAGE
// --------------------------------------
let currentPage = 1;
let userEmail   = "";

const formSteps        = document.querySelectorAll(".form-step");
const stepsBar         = document.getElementById("steps-bar");
const formContainer    = document.getElementById("form-container");
const addressImage     = document.getElementById("address-image");
const imagePlaceholder = document.getElementById("image-placeholder");

imagePlaceholder.classList.add("loading-shimmer");
function preloadImage() {
  const img = new Image();
  img.onload = () => {
    addressImage.classList.add("loaded");
    imagePlaceholder.style.display = "none";
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

// Ajuste la largeur du formulaire selon l'étape et la taille d'écran
function adjustFormWidth() {
  const w = window.innerWidth;
  if (w <= 600) {
    formContainer.style.maxWidth = "95%";
  } else {
    const step = currentPage === 1 ? 1
               : currentPage <= 3 ? 2
               : currentPage === 4 ? 3
               : currentPage === 5 ? 4
                                    : 5;
    formContainer.style.maxWidth = step < 3 ? "500px" : (w < 950 ? "95%" : "900px");
  }
}

function showPage(pageNumber) {
  currentPage = pageNumber;
  formSteps.forEach(page => {
    page.classList.toggle("active", parseInt(page.dataset.page, 10) === pageNumber);
  });

  const progressStep = currentPage === 1 ? 1
                      : currentPage <= 3   ? 2
                      : currentPage === 4  ? 3
                      : currentPage === 5  ? 4
                                            : 5;

  stepsBar.querySelectorAll(".step-item").forEach(item => {
    const s = parseInt(item.dataset.step, 10);
    item.classList.remove("active","completed");
    if (s < progressStep)   item.classList.add("completed");
    else if (s === progressStep) item.classList.add("active");
  });

  stepsBar.classList.toggle("step-narrow", progressStep < 3);
  stepsBar.classList.toggle("step-wide",  progressStep >= 3);

  adjustFormWidth();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function goToPage(pageNumber) {
  showPage(pageNumber);
}

document.addEventListener("DOMContentLoaded", () => {
  preloadImage();
  if (isImageCached(addressImage.src)) {
    addressImage.classList.add("loaded");
    imagePlaceholder.style.display = "none";
  }
  showPage(currentPage);
  window.addEventListener("resize", adjustFormWidth);
});

// --------------------------------------
// 2) VALIDATION & NAVIGATION ENTRE ÉTAPES
// --------------------------------------

// Étape 1 : email + téléphone
const btnStep1   = document.getElementById("btn-step1");
const emailField = document.getElementById("email");
const phoneField = document.getElementById("telephone");
const errEmail   = document.getElementById("error-email");
const errPhone   = document.getElementById("error-telephone");
const emailRe    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

btnStep1.addEventListener("click", () => {
  errEmail.classList.remove("visible"); errEmail.textContent = "";
  errPhone.classList.remove("visible"); errPhone.textContent = "";
  let valid = true;

  const eVal = emailField.value.trim();
  if (!eVal) {
    errEmail.textContent = "Ce champ est requis";
    errEmail.classList.add("visible");
    emailField.style.borderColor = "#e74c3c";
    valid = false;
  } else if (!emailRe.test(eVal)) {
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

// Étape 2 → 3
document.getElementById("btn-step2-part1").addEventListener("click", () => goToPage(3));

// Étape 3 : infos société
const btnStep3        = document.getElementById("btn-step3");
const formeSelect     = document.getElementById("forme-juridique");
const nomSocieteField = document.getElementById("nom-societe");
const radiosSocCree   = document.getElementsByName("societe-cree");
const sirenField      = document.getElementById("siren-field");
const numSirenField   = document.getElementById("num-siren");
const microMsg        = document.getElementById("micro-entreprise-message");
const errForme        = document.getElementById("error-forme");
const errNomSoc       = document.getElementById("error-nomsociete");
const errSociCree     = document.getElementById("error-soccree");
const errSiren        = document.getElementById("error-siren");

formeSelect.addEventListener("change", () => {
  microMsg.style.display = formeSelect.value === "Micro-entreprise" ? "block" : "none";
});

btnStep3.addEventListener("click", () => {
  [errForme, errNomSoc, errSociCree, errSiren].forEach(e => {
    e.classList.remove("visible");
    e.textContent = "";
  });
  let valid = true;

  if (!formeSelect.value) {
    errForme.textContent = "Ce champ est requis";
    errForme.classList.add("visible");
    formeSelect.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    formeSelect.style.borderColor = "#ccc";
  }

  if (!nomSocieteField.value.trim()) {
    errNomSoc.textContent = "Ce champ est requis";
    errNomSoc.classList.add("visible");
    nomSocieteField.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    nomSocieteField.style.borderColor = "#ccc";
  }

  const chosen = Array.from(radiosSocCree).find(r => r.checked)?.value || "";
  if (!chosen) {
    errSociCree.textContent = "Ce champ est requis";
    errSociCree.classList.add("visible");
    valid = false;
  }
  if (chosen === "oui" && !numSirenField.value.trim()) {
    errSiren.textContent = "Ce champ est requis";
    errSiren.classList.add("visible");
    numSirenField.style.borderColor = "#e74c3c";
    valid = false;
  } else if (chosen === "oui") {
    numSirenField.style.borderColor = "#ccc";
  }

  if (valid) goToPage(4);
});

radiosSocCree.forEach(r => {
  r.addEventListener("change", () => {
    sirenField.style.display = r.checked && r.value === "oui" ? "block" : "none";
  });
});

// Étape 4 : adresse de réexpédition
const btnStep4          = document.getElementById("btn-step4");
const addrInput         = document.getElementById("adresse-principale");
const errAddr           = document.getElementById("error-message-adresse");

btnStep4.addEventListener("click", () => {
  errAddr.classList.remove("visible");
  errAddr.textContent = "";
  if (!addrInput.value.trim()) {
    errAddr.textContent = "Ce champ est requis";
    errAddr.classList.add("visible");
    addrInput.style.borderColor = "#e74c3c";
  } else {
    addrInput.style.borderColor = "#ddd";
    goToPage(5);
  }
});

// Sélection fréquence page 5
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
    document.getElementById("total-ht-final").innerText =
      parseFloat(ht).toFixed(2).replace(".", ",") + " €";
    document.getElementById("total-ttc-final").innerText =
      parseFloat(ttc).toFixed(2).replace(".", ",") + " €";
    document.getElementById("recap-domiciliation-final").innerText =
      parseFloat(ht).toFixed(2).replace(".", ",") + " €";
  });
});

// --------------------------------------
// 3) INTÉGRATION STRIPE (mode TEST) + eSignatures
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

// Correction de l'espace en trop avant "click" et payload enrichi
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

  // 2) Récupère l’ID du tarif et type d’abonnement
  const selElem    = document.querySelector("#payment-options-container .frequency-option.selected");
  const priceId    = selElem.dataset.priceId;
  const freqText   = selElem.querySelector('.frequency-title').innerText.toLowerCase();
  const abonnement = freqText.includes('annuel') ? 'Annuelle' : 'Mensuelle';

  try {
    // 3) Création de la souscription Stripe
    const res  = await fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripeToken: token.id, priceId, email: userEmail })
    });
    const data = await res.json();
    if (!data.clientSecret) throw new Error(data.error || "Pas de clientSecret renvoyé");

    // 4) Confirmation 3D Secure
    const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
    if (confirmError) throw new Error("Erreur 3D Secure : " + confirmError.message);

    // 5) Affiche étape 6 + loader
    goToPage(6);
    document.getElementById("contract-loader").style.display   = "block";
    document.getElementById("contract-preview").style.display = "none";

    // 6) Création du contrat eSignatures avec Bastien comme signataire
    const { pdf_url, sign_url } = await createContract({
      subscriptionId: data.subscriptionId,
      email:          userEmail,
      nomSociete:     "Bastien",
      abonnement,
      placeholder_fields: [],
      signer_fields:      [],
      test: "yes"
    });

    // 7) Affiche PDF + configure bouton signer
    document.getElementById("contract-loader").style.display   = "none";
    document.getElementById("contract-iframe").src            = pdf_url;
    document.getElementById("btn-sign").onclick               = () => window.location.href = sign_url;
    document.getElementById("contract-preview").style.display = "block";

    // 8) Peuple les infos de récap
    document.getElementById('conf-sub-id').textContent    = data.subscriptionId;
    document.getElementById('conf-next-bill').textContent = abonnement === 'Mensuelle'
      ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('fr-FR')
      : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR');

  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
});

// --------------------------------------
// 4) BLOCK DE PREVIEW dynamiquement
//    (ouvre https://.../?preview=test)
// --------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.search.includes('preview=test')) {
    // 1) Passe à l’étape 6
    goToPage(6);
    // 2) Affiche loader, cache preview
    document.getElementById('contract-loader').style.display   = 'block';
    document.getElementById('contract-preview').style.display = 'none';

    // 3) Payload de preview pour Bastien
    const previewPayload = {
      subscriptionId:    'sub_test_123',
      email:             document.getElementById('email').value.trim(),
      nomSociete:        "Bastien",
      test:              "yes",
      placeholder_fields: [],
      signer_fields:      []
    };

    try {
      // 4) Appel preview eSignature
      const { pdf_url, sign_url } = await createContract(previewPayload);

      // 5) Injecte le PDF généré
      document.getElementById('contract-loader').style.display   = 'none';
      document.getElementById('contract-iframe').src            = pdf_url;
      document.getElementById('btn-sign').onclick               = () => window.location.href = sign_url;
      document.getElementById('contract-preview').style.display = 'block';

      // 6) Peuple le récap
      document.getElementById('conf-sub-id').textContent    = previewPayload.subscriptionId;
      document.getElementById('conf-next-bill').textContent = new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('fr-FR');

    } catch (e) {
      console.error('Preview eSign error:', e);
      document.getElementById('contract-loader').textContent = 'Erreur de prévisualisation';
    }
  }
});
