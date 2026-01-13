// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nouvelle version du SW en installation...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('📦 Nouvelle version disponible. Rechargez pour mettre à jour.');
              // Optionnel: Afficher une notification à l'utilisateur
              if (confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Erreur enregistrement Service Worker:', error);
      });
  });

  // Recharger la page quand un nouveau SW prend le contrôle
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Détection de l'installation PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  console.log('📱 PWA installable détectée');
  
  // Vous pouvez afficher un bouton personnalisé ici
  // Exemple: showInstallButton();
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installée avec succès!');
  window.deferredPrompt = null;
});
