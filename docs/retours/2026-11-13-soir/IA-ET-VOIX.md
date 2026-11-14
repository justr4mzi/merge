# IA et voix : les options (14 nov. 2026, rien de payant n'a été installé)

## L'IA de Merge aujourd'hui
Merge appelle Gemini sur Vertex AI (Google Cloud) avec le compte de service du projet. C'est payé par ton compte de facturation Google Cloud, où il te reste (capture 04) :
- **269,22 € de crédit gratuit GCP** (crédit de départ, utilisable pour Vertex AI et Text-to-Speech) ;
- **8,99 € par mois** offerts par le « Google Developer Program premium », qui vient avec ton abonnement **Google AI Pro**.

Tant que ces crédits couvrent l'usage, l'IA ne te coûte rien. Garde un budget avec alerte dans « Budgets & caps ».

## Tes abonnements
- **Google AI Pro (permanent)** : c'est le plus utile, grâce aux 8,99 €/mois de crédit Cloud ci-dessus. L'appli Gemini elle-même ne peut pas servir à Merge (pas d'accès par programme).
- **ChatGPT Go (permanent)** et **Claude Pro (ce mois-ci)** : ce sont des abonnements de discussion. Ils ne donnent pas de crédit d'API : impossible de brancher Merge dessus. Claude Pro te sert à faire avancer le code, pas à faire tourner l'appli.

## Alternatives si les crédits baissent
1. **Clé gratuite Gemini (Google AI Studio)** : niveau gratuit avec limites de requêtes par minute et par jour. Attention : sur le niveau gratuit, Google peut utiliser les contenus envoyés (les cours des élèves) pour améliorer ses produits. Possible en secours, pas idéal pour des données d'élèves.
2. **Modèle plus léger** (version « Flash-Lite ») pour les tâches simples (corrections, astuces, emploi du temps) : il suffit de régler `GEMINI_MODEL` ou d'ajouter un modèle rapide pour ces actions. Moins cher et plus rapide, un peu moins précis.
3. **Garder le cache** : Merge ne régénère jamais un contenu déjà fait (c'est déjà le cas).

## Voix : les solutions
| Solution | Qualité | Coût | Remarque |
|---|---|---|---|
| Voix du navigateur (actuelle) | Moyenne (bonne sur Edge et iPhone récent) | Gratuit | Hors ligne, rien à installer |
| Google Cloud TTS, voix WaveNet / Standard | Correcte | 4 $ le million de caractères, **4 millions gratuits par mois** | Couvert par tes crédits |
| Google Cloud TTS, Neural2 | Bonne | 16 $ / million, 1 million gratuit par mois | |
| Google Cloud TTS, **Chirp 3 HD** | Très naturelle | 30 $ / million, **1 million gratuit par mois** | Mon conseil : 1 million de caractères ≈ 18 h de lecture par mois offertes, puis couvert par les crédits |
| Voix Gemini (Gemini TTS) | Très naturelle, expressive | ≈ 0,80 € par heure d'audio jusqu'au 31 déc. 2026, ≈ 1,60 € ensuite | Gratuit sur AI Studio (mêmes réserves que plus haut) |
| OpenAI (gpt-4o-mini-tts) | Très bonne | 12 $ par million de jetons audio | Modèle marqué « déprécié » par OpenAI, pas couvert par ChatGPT Go |
| ElevenLabs | Excellente | Gratuit ≈ 10 min/mois, 6 $/mois ≈ 30 min, 22 $/mois ≈ 2 h | Trop cher pour beaucoup d'élèves |

**Conseil** : Chirp 3 HD via Google Cloud (gratuit jusqu'à 1 million de caractères par mois, puis tes crédits), avec mise en cache des fichiers audio dans Supabase Storage pour ne jamais payer deux fois la même carte. La voix du navigateur reste en secours hors ligne. Dis-moi « go Chirp » et je le branche.

Sources : [prix Google Cloud TTS](https://cloud.google.com/text-to-speech/pricing/?authuser=4), [prix Gemini TTS](https://eesel.ai/blog/gemini-3-8-flash-tts-pricing), [ElevenLabs](https://smallest.ai/blog/elevenlabs-pricing-plans-cost-what-you-get-in-2026), [OpenAI gpt-4o-mini-tts](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts).
