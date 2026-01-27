# 📺 Open-Reels Player

Un lecteur vidéo minimaliste et Open Source conçu pour visionner des contenus publics (Reels, etc.) sans les distractions des réseaux sociaux.

## ✨ Philosophie

Ce projet vise à offrir une expérience de visionnage centrée sur le contenu, sans algorithmes intrusifs, sans tracking et sans nécessité de compte, tout en respectant le travail des créateurs originaux.

## 🚀 Fonctionnalités

- **Curation manuelle** : Créez et partagez des playlists de liens publics.
- **Privacy-focused** : Pas de stockage de données, pas de cookies tiers.
- **Direct Link** : Un bouton permet de basculer instantanément sur l'application originale pour soutenir/liker le créateur.

## ⚖️ Disclaimer (Avertissement Légal)

Ce logiciel est fourni "en l'état", à des fins éducatives et de démonstration technique.

1. **Propriété intellectuelle** : Ce projet ne stocke aucune vidéo. Tous les flux proviennent directement des serveurs de la plateforme originale. Les droits d'auteur appartiennent exclusivement aux créateurs.
2. **Usage** : L'utilisateur est responsable de l'usage qu'il fait de cet outil. Nous encourageons vivement les utilisateurs à visiter les liens originaux pour soutenir les créateurs.
3. **Conditions des plateformes** : Ce projet n'est pas affilié, associé, autorisé ou approuvé par Meta, Instagram ou toute autre plateforme mentionnée.

## ⚖️ Avis Juridique

**LIMITATION DE RESPONSABILITÉ :** L'auteur de ce logiciel ne pourra être tenu responsable de toute utilisation non conforme aux Conditions Générales d'Utilisation des plateformes tierces. Ce projet utilise des techniques d'affichage standard (framing/embedding) pour les contenus rendus publics par leurs auteurs originaux.

Si vous êtes un ayant-droit et souhaitez qu'un contenu spécifique ne soit plus accessible via cet outil, veuillez noter qu'**aucune donnée n'est hébergée sur ce serveur** ; les demandes de suppression doivent être adressées à la plateforme source où le contenu est initialement stocké.

## 📄 Licence

Ce projet est sous licence **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

S'agissant d'un projet Open Source, les contributions sont les bienvenues ! N'hésitez pas à ouvrir une "issue" ou à soumettre une "pull request" si vous souhaitez améliorer le lecteur ou signaler un bug.

---

### EN

# 📺 Open-Reels Player

A minimalist, Open Source video player designed to view public content (Reels, etc.) without the distractions, tracking, or forced logins of social media platforms.

## ✨ Philosophy

This project aims to provide a content-centered viewing experience. No intrusive algorithms, no tracking, and no account required—all while respecting the work of the original creators by providing direct attribution and links.

## 🚀 Features

- **Curated Playlists**: Manually managed lists of high-quality public content.
- **Privacy-Focused**: No data storage, no third-party cookies, and no user tracking.
- **Direct Support**: A dedicated button allows users to jump to the original app to like, comment, or follow the creator directly.
- **Lightweight UI**: A clean interface focused purely on the video.

## 🛠 Technical Stack

- **Frontend**: [e.g., React / Next.js]
- **Streaming Proxy**: Node.js / Express (to handle CORS and Referrer headers).
- **Extraction**: Powered by Open Source tools to resolve public URLs.

## ⚖️ Legal Disclaimer

**LIMITATION OF LIABILITY:** The author of this software shall not be held responsible for any use that does not comply with the Terms of Service of third-party platforms. This project utilizes standard display techniques (framing/embedding) for content made public by their original creators.

If you are a copyright holder and wish for specific content to no longer be accessible via this tool, please note that **no data is hosted on this server**; removal requests must be directed to the source platform where the content is originally stored.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

As this is an Open Source project, contributions are welcome! Feel free to open an issue or submit a pull request if you want to improve the player or report a bug.

## 🚀 Deployment

### Frontend (GitHub Pages)

1. Update `API_BASE_URL` in `App.jsx` to your Render backend URL.
2. In `frontend/package.json`, add `"homepage": "https://<your-username>.github.io/open-reels-player"`.
3. Run `npm run build`.
4. Deploy the `dist` folder to GitHub Pages.

### Backend (Render)

1. Create a new Web Service on Render.
2. Build Command: `npm install`
3. Start Command: `node server.js`
4. **Environment**: Ensure `yt-dlp` is available in the environment (Render usually has it or you can use a custom Dockerfile).
