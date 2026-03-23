# 🎬 LOCALSTREAM

**LOCALSTREAM** est une application de streaming multimédia locale moderne et élégante, conçue pour transformer vos dossiers de vidéos (films et séries) en une bibliothèque interactive inspirée des plus grandes plateformes de streaming.

Disponible en version Web et nativement sur **Android** grâce à Capacitor.

---

## ✨ Fonctionnalités Clés

- 📱 **Interface Mobile Optimizée** : Design "Glassmorphism" moderne avec prise en compte des encoches (safe areas) pour un affichage plein écran premium.
- 📂 **Scan Automatique (Android)** : Scannez vos dossiers `Movies`, `Download` et `Documents` en un clic pour indexer vos vidéos stockées sur téléphone.
- 🧠 **Identification Intelligente** : Nettoyage automatique des noms de fichiers pour reconnaître les titres, saisons et épisodes.
- 🖼️ **Intégration TMDB** : Récupération automatique des affiches officielles, arrière-plans, descriptions et genres (nécessite une clé API TMDB).
- 💬 **Sous-titres OpenSubtitles** : Recherche et téléchargement direct de sous-titres en français ou anglais depuis l'application.
- 📋 **Gestion de Playlists** : Créez vos propres listes de lecture personnalisées.
- 🕰️ **Reprise de Lecture** : Sauvegarde automatique de votre progression pour chaque vidéo.
- 🔍 **Filtres et Tris Avancés** : Classez par genre, qualité (4K, 1080p, etc.), date ou ordre alphabétique.

---

## 🚀 Installation & Lancement

### Prérequis
- Node.js
- Android Studio (pour la version mobile)

### Installation
1. Clonez le dépôt :
   ```bash
   git clone https://github.com/DZTic/localstream.git
   cd localstream
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```

### Lancer la version Web
```bash
npm run dev
```

### Compiler pour Android
1. Construisez le projet web :
   ```bash
   npm run build
   ```
2. Synchronisez avec Capacitor :
   ```bash
   npx cap sync android
   ```
3. Ouvrez dans Android Studio ou lancez directement :
   ```bash
   npx cap run android
   ```

---

## 🛠️ Technologies Utilisées

- **Frontend** : [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Native Bridge** : [Capacitor](https://capacitorjs.com/)
- **Style** : [Tailwind CSS](https://tailwindcss.com/)
- **Icons** : [Lucide React](https://lucide.dev/)
- **APIs** : [TMDB](https://www.themoviedb.org/documentation/api) & [OpenSubtitles](https://www.opensubtitles.com/)

---

## ⚙️ Configuration

Pour profiter pleinement de l'expérience, renseignez vos clés API dans l'onglet **Paramètres** (icône ⚙️) de l'application :
- **TMDB API Key** : Pour les affiches et métadonnées.
- **OpenSubtitles Credentials** : Pour la recherche de sous-titres.

---

## 📄 Licence
Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
