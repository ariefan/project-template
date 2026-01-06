import type { LocaleNames, PersonName } from "../types";

/** Javanese names - the largest ethnic group in Indonesia */
const javaneseNames: PersonName[] = [
  { firstName: "Budi", lastName: "Santoso", ethnicity: "javanese" },
  { firstName: "Dewi", lastName: "Lestari", ethnicity: "javanese" },
  { firstName: "Agus", lastName: "Susanto", ethnicity: "javanese" },
  { firstName: "Sri", lastName: "Wahyuni", ethnicity: "javanese" },
  { firstName: "Bambang", lastName: "Prasetyo", ethnicity: "javanese" },
  { firstName: "Siti", lastName: "Rahayu", ethnicity: "javanese" },
  { firstName: "Hadi", lastName: "Wibowo", ethnicity: "javanese" },
  { firstName: "Endang", lastName: "Suryani", ethnicity: "javanese" },
  { firstName: "Joko", lastName: "Widodo", ethnicity: "javanese" },
  { firstName: "Ratna", lastName: "Kusuma", ethnicity: "javanese" },
  { firstName: "Eko", lastName: "Purnomo", ethnicity: "javanese" },
  { firstName: "Yuni", lastName: "Astuti", ethnicity: "javanese" },
  { firstName: "Sugeng", lastName: "Riyadi", ethnicity: "javanese" },
  { firstName: "Tutik", lastName: "Handayani", ethnicity: "javanese" },
  { firstName: "Wahyu", lastName: "Nugroho", ethnicity: "javanese" },
  { firstName: "Ning", lastName: "Setyowati", ethnicity: "javanese" },
  { firstName: "Teguh", lastName: "Subagyo", ethnicity: "javanese" },
  { firstName: "Retno", lastName: "Palupi", ethnicity: "javanese" },
  { firstName: "Dwi", lastName: "Hartono", ethnicity: "javanese" },
  { firstName: "Lastri", lastName: "Wuryani", ethnicity: "javanese" },
];

/** Sundanese names - West Java ethnic group */
const sundaneseNames: PersonName[] = [
  { firstName: "Asep", lastName: "Supriatna", ethnicity: "sundanese" },
  { firstName: "Euis", lastName: "Komariah", ethnicity: "sundanese" },
  { firstName: "Dede", lastName: "Kurniawan", ethnicity: "sundanese" },
  { firstName: "Yayah", lastName: "Nurhasanah", ethnicity: "sundanese" },
  { firstName: "Ujang", lastName: "Rohman", ethnicity: "sundanese" },
  { firstName: "Neneng", lastName: "Sarinengsih", ethnicity: "sundanese" },
  { firstName: "Cecep", lastName: "Hidayat", ethnicity: "sundanese" },
  { firstName: "Ai", lastName: "Rosita", ethnicity: "sundanese" },
  { firstName: "Ade", lastName: "Mulyana", ethnicity: "sundanese" },
  { firstName: "Imas", lastName: "Sukaesih", ethnicity: "sundanese" },
  { firstName: "Agung", lastName: "Permana", ethnicity: "sundanese" },
  { firstName: "Tuti", lastName: "Alawiyah", ethnicity: "sundanese" },
  { firstName: "Dadang", lastName: "Sutisna", ethnicity: "sundanese" },
  { firstName: "Iis", lastName: "Aisyah", ethnicity: "sundanese" },
  { firstName: "Oding", lastName: "Supriadi", ethnicity: "sundanese" },
];

/** Batak names - North Sumatra ethnic group (with marga/clan names) */
const batakNames: PersonName[] = [
  { firstName: "Hotman", lastName: "Situmorang", ethnicity: "batak" },
  { firstName: "Ruth", lastName: "Panjaitan", ethnicity: "batak" },
  { firstName: "Parulian", lastName: "Simatupang", ethnicity: "batak" },
  { firstName: "Tiur", lastName: "Simanjuntak", ethnicity: "batak" },
  { firstName: "Mangatas", lastName: "Manurung", ethnicity: "batak" },
  { firstName: "Berliana", lastName: "Hutapea", ethnicity: "batak" },
  { firstName: "Binsar", lastName: "Sinaga", ethnicity: "batak" },
  { firstName: "Rotua", lastName: "Siregar", ethnicity: "batak" },
  { firstName: "Parasian", lastName: "Napitupulu", ethnicity: "batak" },
  { firstName: "Megawati", lastName: "Siahaan", ethnicity: "batak" },
  { firstName: "Togar", lastName: "Pardede", ethnicity: "batak" },
  { firstName: "Sarma", lastName: "Tampubolon", ethnicity: "batak" },
  { firstName: "Luhut", lastName: "Pangaribuan", ethnicity: "batak" },
  { firstName: "Risma", lastName: "Sianturi", ethnicity: "batak" },
  { firstName: "Poltak", lastName: "Lumbantobing", ethnicity: "batak" },
];

/** Minangkabau names - West Sumatra (with matrilineal titles) */
const minangNames: PersonName[] = [
  { firstName: "Rusdi", lastName: "Dt. Marajo", ethnicity: "minang" },
  { firstName: "Yuliana", lastName: "Bundo Kanduang", ethnicity: "minang" },
  { firstName: "Hendra", lastName: "Sutan Maharajo", ethnicity: "minang" },
  { firstName: "Fitri", lastName: "Puti Bungsu", ethnicity: "minang" },
  {
    firstName: "Afrizal",
    lastName: "Dt. Rajo Nan Gadang",
    ethnicity: "minang",
  },
  { firstName: "Melati", lastName: "Siti Nurbaya", ethnicity: "minang" },
  { firstName: "Zulkifli", lastName: "Sutan Pamuncak", ethnicity: "minang" },
  { firstName: "Nila", lastName: "Puti Linduang Bulan", ethnicity: "minang" },
  { firstName: "Dasril", lastName: "Dt. Pangulu", ethnicity: "minang" },
  { firstName: "Ratih", lastName: "Upiak Isil", ethnicity: "minang" },
  { firstName: "Nasrul", lastName: "Malin Marajo", ethnicity: "minang" },
  { firstName: "Syafira", lastName: "Puti Nilam", ethnicity: "minang" },
];

/** Chinese-Indonesian names (typically with Indonesian-ized surnames) */
const chineseNames: PersonName[] = [
  { firstName: "Steven", lastName: "Tanujaya", ethnicity: "chinese" },
  { firstName: "Jessica", lastName: "Wijaya", ethnicity: "chinese" },
  { firstName: "Kevin", lastName: "Susanto", ethnicity: "chinese" },
  { firstName: "Michelle", lastName: "Hartono", ethnicity: "chinese" },
  { firstName: "William", lastName: "Gunawan", ethnicity: "chinese" },
  { firstName: "Felicia", lastName: "Salim", ethnicity: "chinese" },
  { firstName: "Andrew", lastName: "Tanjung", ethnicity: "chinese" },
  { firstName: "Natalia", lastName: "Widjaja", ethnicity: "chinese" },
  { firstName: "Jonathan", lastName: "Liem", ethnicity: "chinese" },
  { firstName: "Cynthia", lastName: "Oei", ethnicity: "chinese" },
  { firstName: "Patrick", lastName: "Tjandra", ethnicity: "chinese" },
  { firstName: "Vivian", lastName: "Kwee", ethnicity: "chinese" },
  { firstName: "Raymond", lastName: "Halim", ethnicity: "chinese" },
  { firstName: "Angela", lastName: "Tanuwijaya", ethnicity: "chinese" },
  { firstName: "Daniel", lastName: "Wongso", ethnicity: "chinese" },
];

/** Betawi names - Jakarta native ethnic group */
const betawiNames: PersonName[] = [
  { firstName: "Sabeni", lastName: "Saputra", ethnicity: "betawi" },
  { firstName: "Mpok", lastName: "Atun", ethnicity: "betawi" },
  { firstName: "Haji", lastName: "Bokir", ethnicity: "betawi" },
  { firstName: "Enyak", lastName: "Salmah", ethnicity: "betawi" },
  { firstName: "Bang", lastName: "Jampang", ethnicity: "betawi" },
  { firstName: "Neng", lastName: "Geulis", ethnicity: "betawi" },
  { firstName: "Mandra", lastName: "Ridwan", ethnicity: "betawi" },
  { firstName: "Rohaya", lastName: "Nurjanah", ethnicity: "betawi" },
  { firstName: "Benyamin", lastName: "Sueb", ethnicity: "betawi" },
  { firstName: "Ida", lastName: "Royani", ethnicity: "betawi" },
];

/** Malay names - Sumatra and Kalimantan coastal areas */
const malayNames: PersonName[] = [
  { firstName: "Tengku", lastName: "Ahmad", ethnicity: "malay" },
  { firstName: "Raja", lastName: "Salmah", ethnicity: "malay" },
  { firstName: "Wan", lastName: "Ismail", ethnicity: "malay" },
  { firstName: "Puteri", lastName: "Nur Aisyah", ethnicity: "malay" },
  { firstName: "Datuk", lastName: "Rahman", ethnicity: "malay" },
  { firstName: "Encik", lastName: "Zainal", ethnicity: "malay" },
  { firstName: "Syed", lastName: "Abdullah", ethnicity: "malay" },
  { firstName: "Che", lastName: "Fatimah", ethnicity: "malay" },
  { firstName: "Tuan", lastName: "Haji Umar", ethnicity: "malay" },
  { firstName: "Mak", lastName: "Intan", ethnicity: "malay" },
];

/** Bugis names - South Sulawesi ethnic group */
const bugisNames: PersonName[] = [
  { firstName: "Andi", lastName: "Mappanyukki", ethnicity: "bugis" },
  { firstName: "Puang", lastName: "Latemmamala", ethnicity: "bugis" },
  { firstName: "Daeng", lastName: "Mattiro", ethnicity: "bugis" },
  { firstName: "Petta", lastName: "Becce", ethnicity: "bugis" },
  { firstName: "Karaeng", lastName: "Pattingalloang", ethnicity: "bugis" },
  { firstName: "Aru", lastName: "Palakka", ethnicity: "bugis" },
  { firstName: "La", lastName: "Tenri Tappu", ethnicity: "bugis" },
  { firstName: "We", lastName: "Tenri Pakoko", ethnicity: "bugis" },
  { firstName: "Ambe", lastName: "Marola", ethnicity: "bugis" },
  { firstName: "Indo", lastName: "Mariattang", ethnicity: "bugis" },
];

// Combine all names for flat access
const allNames = [
  ...javaneseNames,
  ...sundaneseNames,
  ...batakNames,
  ...minangNames,
  ...chineseNames,
  ...betawiNames,
  ...malayNames,
  ...bugisNames,
];

export const indonesianNames: LocaleNames = {
  ethnicities: {
    javanese: javaneseNames,
    sundanese: sundaneseNames,
    batak: batakNames,
    minang: minangNames,
    chinese: chineseNames,
    betawi: betawiNames,
    malay: malayNames,
    bugis: bugisNames,
  },
  firstNames: [...new Set(allNames.map((n) => n.firstName))],
  lastNames: [...new Set(allNames.map((n) => n.lastName))],
};
