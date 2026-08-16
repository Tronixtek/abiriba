// Curated list of Nigerian cities/towns for the vendor-facing city picker.
// Keeping this a fixed list (rather than free text) is what lets the
// customer-facing marketplace filter be a reliable dropdown too — every
// vendor picks from the same canonical names, so there's no "Aba" vs "aba,
// abia state" fragmentation on the search side. It can't cover every town in
// the country, so the picker also offers an "Other" option that falls back
// to free text for anywhere not listed here.
export const NIGERIAN_CITIES = [
  // Abia
  "Aba",
  "Umuahia",
  "Ohafia",
  "Arochukwu",
  "Abiriba",
  "Isiala Ngwa",
  "Umunneochi",
  // Adamawa
  "Yola",
  "Mubi",
  "Numan",
  "Ganye",
  "Jimeta",
  // Akwa Ibom
  "Uyo",
  "Ikot Ekpene",
  "Eket",
  "Oron",
  "Abak",
  // Anambra
  "Awka",
  "Onitsha",
  "Nnewi",
  "Ekwulobia",
  "Aguata",
  // Bauchi
  "Bauchi",
  "Azare",
  "Misau",
  "Jama'are",
  // Bayelsa
  "Yenagoa",
  "Brass",
  "Sagbama",
  "Ogbia",
  // Benue
  "Makurdi",
  "Gboko",
  "Otukpo",
  "Katsina-Ala",
  // Borno
  "Maiduguri",
  "Biu",
  "Bama",
  "Dikwa",
  // Cross River
  "Calabar",
  "Ogoja",
  "Ikom",
  "Obudu",
  // Delta
  "Asaba",
  "Warri",
  "Sapele",
  "Ughelli",
  "Agbor",
  // Ebonyi
  "Abakaliki",
  "Afikpo",
  "Onueke",
  // Edo
  "Benin City",
  "Auchi",
  "Ekpoma",
  "Uromi",
  // Ekiti
  "Ado-Ekiti",
  "Ikere-Ekiti",
  "Ikole-Ekiti",
  "Ijero-Ekiti",
  // Enugu
  "Enugu",
  "Nsukka",
  "Agbani",
  "Oji River",
  // FCT
  "Abuja",
  "Gwagwalada",
  "Kuje",
  "Bwari",
  // Gombe
  "Gombe",
  "Kaltungo",
  "Billiri",
  // Imo
  "Owerri",
  "Orlu",
  "Okigwe",
  "Mbaise",
  // Jigawa
  "Dutse",
  "Hadejia",
  "Gumel",
  "Kazaure",
  // Kaduna
  "Kaduna",
  "Zaria",
  "Kafanchan",
  "Sabon Gari",
  // Kano
  "Kano",
  "Wudil",
  "Gwarzo",
  // Katsina
  "Katsina",
  "Funtua",
  "Daura",
  "Malumfashi",
  // Kebbi
  "Birnin Kebbi",
  "Argungu",
  "Yauri",
  // Kogi
  "Lokoja",
  "Okene",
  "Idah",
  "Kabba",
  // Kwara
  "Ilorin",
  "Offa",
  "Omu-Aran",
  "Jebba",
  // Lagos
  "Lagos",
  "Ikeja",
  "Lekki",
  "Badagry",
  "Epe",
  "Ikorodu",
  "Surulere",
  // Nasarawa
  "Lafia",
  "Keffi",
  "Akwanga",
  "Nasarawa",
  // Niger
  "Minna",
  "Bida",
  "Suleja",
  "Kontagora",
  // Ogun
  "Abeokuta",
  "Sagamu",
  "Ijebu-Ode",
  "Ota",
  // Ondo
  "Akure",
  "Ondo",
  "Owo",
  "Ikare-Akoko",
  // Osun
  "Osogbo",
  "Ile-Ife",
  "Ilesa",
  "Ede",
  // Oyo
  "Ibadan",
  "Ogbomosho",
  "Oyo",
  "Iseyin",
  // Plateau
  "Jos",
  "Bukuru",
  "Pankshin",
  "Shendam",
  // Rivers
  "Port Harcourt",
  "Bonny",
  "Ahoada",
  "Okrika",
  // Sokoto
  "Sokoto",
  "Wurno",
  "Tambuwal",
  // Taraba
  "Jalingo",
  "Wukari",
  "Bali",
  // Yobe
  "Damaturu",
  "Potiskum",
  "Nguru",
  // Zamfara
  "Gusau",
  "Kaura Namoda",
  "Talata Mafara",
].sort((a, b) => a.localeCompare(b));
