// --------------------------------------
// 1) NAVIGATION & PRÉCHARGEMENT IMAGE
// --------------------------------------

// Variables globales
let currentPage = 1;
const formSteps     = document.querySelectorAll(".form-step");
const stepsBar      = document.getElementById("steps-bar");
const formContainer = document.getElementById("form-container");
let imageLoaded     = false;

const addressImage     = document.getElementById("address-image");
const imagePlaceholder = document.getElementById("image-placeholder");

// Ajout de l’effet “shimmer” lors du chargement
imagePlaceholder.classList.add("loading-shimmer");

// Précharge l’image et cache le placeholder
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

// Vérifie si l’image est déjà en cache
function isImageCached(src) {
  const img = new Image();
  img.src = src;
  return img.complete;
}

// Affiche la page demandée et met à jour la barre d’étapes
function showPage(pageNumber) {
  formSteps.forEach(page => {
    page.classList.toggle("active", parseInt(page.dataset.page, 10) === pageNumber);
  });

  let progressStep = 1;
  if      (pageNumber === 1)                    progressStep = 1;
  else if (pageNumber === 2 || pageNumber === 3) progressStep = 2;
  else if (pageNumber === 4)                    progressStep = 3;
  else if (pageNumber === 5)                    progressStep = 4;
  else if (pageNumber === 6)                    progressStep = 5;

  stepsBar.querySelectorAll(".step-item").forEach(item => {
    const itemStep = parseInt(item.dataset.step, 10);
    item.classList.remove("active","completed");
    if      (itemStep < progressStep)   item.classList.add("completed");
    else if (itemStep === progressStep) item.classList.add("active");
  });

  // Ajuste la largeur du conteneur selon l'étape
  if (progressStep < 3) {
    stepsBar.classList.replace("step-wide","step-narrow");
    formContainer.style.maxWidth = "500px";
  } else {
    stepsBar.classList.replace("step-narrow","step-wide");
    formContainer.style.maxWidth = "900px";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Passe à la page indiquée
function goToPage(pageNumber) {
  currentPage = pageNumber;
  showPage(pageNumber);
}

// Initialisation au chargement du DOM
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

// Étape 1 : email + téléphone
const btnStep1 = document.getElementById("btn-step1");
const email    = document.getElementById("email");
const phone    = document.getElementById("telephone");
const errEmail = document.getElementById("error-email");
const errPhone = document.getElementById("error-telephone");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

btnStep1.addEventListener("click", () => {
  [errEmail, errPhone].forEach(e => {
    e.classList.remove("visible");
    e.textContent = "";
  });
  let valid = true;

  const eVal = email.value.trim();
  if (!eVal) {
    errEmail.textContent = "Ce champ est requis";
    errEmail.classList.add("visible");
    email.style.borderColor = "#e74c3c";
    valid = false;
  } else if (!emailRegex.test(eVal)) {
    errEmail.textContent = "Adresse e-mail invalide";
    errEmail.classList.add("visible");
    email.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    email.style.borderColor = "#ccc";
  }

  const pVal = phone.value.trim();
  if (!pVal) {
    errPhone.textContent = "Ce champ est requis";
    errPhone.classList.add("visible");
    phone.style.borderColor = "#e74c3c";
    valid = false;
  } else {
    phone.style.borderColor = "#ccc";
  }

  if (valid) goToPage(2);
});

// Étape 2 : passage direct à 3
const btnStep2 = document.getElementById("btn-step2-part1");
btnStep2.addEventListener("click", () => goToPage(3));

// Étape 3 : infos société
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
  [errForme, errNomSoc, errSocCree, errSiren].forEach(e => {
    e.classList.remove("visible");
    e.textContent = "";
  });
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

// Étape 4 : adresse de réexpédition
const btnStep4         = document.getElementById("btn-step4");
const adressePrincipale = document.getElementById("adresse-principale");
const errAdresse       = document.getElementById("error-message-adresse");

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

// Sélection de la fréquence (page 5)
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
    document.getElementById("total-ht-final").innerText        = parseFloat(ht).toFixed(2).replace(".",",") + " €";
    document.getElementById("total-ttc-final").innerText       = parseFloat(ttc).toFixed(2).replace(".",",") + " €";
    document.getElementById("recap-domiciliation-final").innerText =
      parseFloat(ht).toFixed(2).replace(".",",") + " €";
  });
});

// --------------------------------------
// 3) INTÉGRATION STRIPE (mode TEST)
// --------------------------------------

// Initialise Stripe en test pour tes essais
const stripe = Stripe("pk_test_51QfLJWPs1z3kB9qHrbfhmcDseTIn6dvRXJSi71Od69vd1aDEFsb8HWn42gB4gxCdi6DccsccrDXqEvPmiakxdGEQ00OVGdQkcQ");
const elements = stripe.elements();

const style = {
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
  const country = document.getElementById("card-country").value || "FR";
  const { token, error } = await stripe.createToken(cardNumber, {
    name: "Nom Sur La Carte",
    address_country: country
  });
  if (error) {
    document.getElementById("card-errors").textContent = error.message;
    return;
  }

  const selectedElem = document.querySelector(".frequency-option.selected");
  const priceId = selectedElem.dataset.priceId;
  const clientEmail = document.getElementById("email").value;

  try {
    const res = await fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ stripeToken: token.id, priceId, email: clientEmail })
    });
    const data = await res.json();

    if (!data.clientSecret) {
      throw new Error(data.error || "Pas de clientSecret renvoyé");
    }

    const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
    if (confirmError) {
      throw new Error("Erreur 3D Secure : " + confirmError.message);
    }

    goToPage(6);
    document.getElementById("conf-sub-id").innerText   = data.subscriptionId;
    document.getElementById("conf-next-bill").innerText =
      new Date(Date.now() + 30*24*3600*1000).toLocaleDateString();
  } catch (err) {
    alert(`Erreur paiement : ${err.message}`);
  }
});
