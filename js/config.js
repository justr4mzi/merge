// Réglages de l'appli. Aucune clé secrète ici : seulement la clé publique Supabase.
window.CONFIG = {
  NOM_APPLI: "Merge",
  SUPABASE_URL: "https://dmevntylywocyumgotij.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_D2-NRuWFXH-Cs1I-uELXNg_jqwQ1KNO",
  VAPID_PUBLIC_KEY: "BCIh5w6iH8IkBI3K2UZBGodFZhKEsqO5eVrpxBSWh6zfGa-Juo1cWXTebwDFi7AM0AKAwuro-kWQM_ZS5TTyh60",
  QUOTA_IA_PAR_JOUR: 40,
  // Lien du bouton « Contacter le créateur » (quota atteint, Réglages). Peut être un mailto:, un profil Instagram, etc.
  CONTACT_CREATEUR: "https://github.com/justr4mzi",
  // Musiques de fond : chaque titre est découpé en morceaux de 40 minutes (moins de 25 Mo, limite de l'hébergeur), servis par le site.
  LOFI: [
    { nom: "Lofi", parts: [0, 1, 2, 3, 4].map(function (k) { return "audio/lofi-" + k + ".mp3"; }) },
    { nom: "Christmas Lofi", parts: [0, 1, 2, 3, 4].map(function (k) { return "audio/christmas-" + k + ".mp3"; }) }
  ],
  CARTES_PAR_DEFAUT: 40,
  CARTES_MAX: 100,
  PAGES_MAX_PAR_IMPORT: 400
};
