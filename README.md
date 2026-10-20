# Recueil Militaire Supérieur (PWA)

Application 100 % statique, sans dépendance : HTML + CSS + JavaScript.

## Lancer
Un service worker exige http(s) (pas file://) :

    cd rms && python3 -m http.server 8080
    # puis http://localhost:8080

Hébergement : n'importe quel hébergeur statique en HTTPS. Une fois chargée une première fois, l'application fonctionne hors-ligne.

## Compléter les contenus (aucun code à modifier)
- data/exams.json    : fiches d'épreuves par étape (remplacer les « À RENSEIGNER », passer verified à true)
- data/library.json  : textes réglementaires, annales, rapports (corps en Markdown, ou url vers un PDF dans /docs/)
- data/qcm.json      : questions (subject, exams, choices, answer = index à partir de 0, explain)
- data/sport.json    : barèmes. Ceux fournis sont des EXEMPLES NON OFFICIELS
- data/calendar.json : dates officielles (modifiables aussi dans l'onglet Progression)

## Mise à jour hors-ligne
Après toute modification de fichier, incrémenter VERSION dans sw.js (ex. rms-v2).

## Données personnelles
Résultats, dates et documents ajoutés restent dans le localStorage de l'appareil (aucun serveur).
