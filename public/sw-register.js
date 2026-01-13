// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Vérifier les mises à jour toutes les heures (pas à chaque chargement)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nouvelle version du SW en installation...');
          
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            // Ne recharger que si un nouveau worker est installé ET qu'il y avait un ancien
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('📦 Nouvelle version disponible.');
              
              // Afficher une notification discrète au lieu d'un alert bloquant
              showUpdateNotification(() => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              });
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Erreur enregistrement Service Worker:', error);
      });
  });

  // Recharger SEULEMENT quand un nouveau SW prend le contrôle de manière contrôlée
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('🔄 Nouveau Service Worker actif');
      // Ne pas recharger automatiquement ici pour éviter la boucle
    }
  });
}

// Fonction pour afficher une notification de mise à jour discrète
function showUpdateNotification(onUpdate) {
  // Vérifier si une notification n'est pas déjà affichée
  if (document.getElementById('update-notification')) return;
  
  const notification = document.createElement('div');
  notification.id = 'update-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1e40af;
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 320px;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  
  notification.innerHTML = `
    <div style="flex: 1;">
      <div style="font-weight: bold; margin-bottom: 4px;">Mise à jour disponible</div>
      <div style="font-size: 14px; opacity: 0.9;">Une nouvelle version est prête</div>
    </div>
    <button id="update-btn" style="
      background: white;
      color: #1e40af;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    ">Mettre à jour</button>
    <button id="dismiss-btn" style="
      background: transparent;
      color: white;
      border: none;
      padding: 8px;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    ">×</button>
  `;
  
  document.body.appendChild(notification);
  
  document.getElementById('update-btn').addEventListener('click', () => {
    notification.remove();
    onUpdate();
  });
  
  document.getElementById('dismiss-btn').addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto-dismiss après 10 secondes
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

// Détection de l'installation PWA (garder tel quel)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  console.log('📱 PWA installable détectée');
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installée avec succès!');
  window.deferredPrompt = null;
});
