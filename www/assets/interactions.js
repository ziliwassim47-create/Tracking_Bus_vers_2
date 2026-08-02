
(function () {
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message || 'Action effectuée';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  window.showToast = showToast;

  document.addEventListener('click', async function (event) {
    const link = event.target.closest('[data-link]');
    if (link) {
      event.preventDefault();
      window.location.href = link.dataset.link;
      return;
    }
    const trigger = event.target.closest('[data-toast]');
    if (trigger) {
      event.preventDefault();
      showToast(trigger.dataset.toast);
      return;
    }
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      event.preventDefault();
      tab.parentElement.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
      const lineName = document.querySelector('[data-line-name]');
      if (lineName) lineName.textContent = tab.dataset.tab;
      return;
    }
    const childAction = event.target.closest('[data-child-action]');
    if (childAction) {
      event.preventDefault();
      const row = childAction.closest('.list-item');
      const status = row.querySelector('[data-child-status]');
      if (status) {
        status.textContent = childAction.dataset.childAction;
        status.hidden = false;
      }
      showToast(`${row.dataset.childName || 'Enfant'} : ${childAction.dataset.childAction}`);
      return;
    }
    const share = event.target.closest('[data-share]');
    if (share) {
      event.preventDefault();
      try {
        if (navigator.share) await navigator.share({ title: 'Suivi du bus scolaire', text: 'Suivez le bus scolaire en temps réel.', url: location.href });
        else if (navigator.clipboard) await navigator.clipboard.writeText(location.href);
        showToast('Lien de suivi partagé');
      } catch (_) { showToast('Partage annulé'); }
      return;
    }
    const addField = event.target.closest('[data-add-field]');
    if (addField) {
      event.preventDefault();
      const target = document.querySelector(addField.dataset.target);
      if (!target) return;
      const type = addField.dataset.addField;
      const number = target.querySelectorAll('.form-group').length + 1;
      const wrap = document.createElement('div');
      wrap.className = 'form-group added-field';
      wrap.innerHTML = `<label class="form-label">${type} ${number}</label><input class="form-control" value="${type === 'Trajet' ? 'Après-midi 16:30' : type === 'Arrêt' ? 'Nouvel arrêt' : ''}">`;
      target.appendChild(wrap);
      return;
    }
  });

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const email = String(document.getElementById('email').value || '').toLowerCase();
    if (email.includes('admin')) location.href = '../administration/accueil.html';
    else if (email.includes('assistant') || email.includes('assistante') || email.includes('chauffeur') || email.includes('driver')) location.href = '../assistante/accueil.html';
    else location.href = '../parent/accueil.html';
  });

  const roleSelect = document.getElementById('role-select');
  const roleNext = document.getElementById('role-next');
  if (roleSelect && roleNext) roleNext.addEventListener('click', function () {
    const routes = { parent: 'ajouter-parent.html', chauffeur: 'ajouter-chauffeur.html', assistante: 'ajouter-assistante.html', administration: 'ajouter-admin.html' };
    location.href = routes[roleSelect.value];
  });
})();
