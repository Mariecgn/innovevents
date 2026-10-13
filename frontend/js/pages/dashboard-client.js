(function () {
    const session = guardPage(['CLIENT']);
    if (!session) return;

    const $ = (id) => document.getElementById(id);

    $('prenom').textContent = session.firstname;

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    $('date-du-jour').textContent = today.charAt(0).toUpperCase() + today.slice(1);

    $('icon-events').innerHTML = icon('calendar', 24);
    $('icon-quote').innerHTML = icon('edit', 24);
    $('icon-contact').innerHTML = icon('mail', 24);

    $('client-notice').innerHTML = alertHtml(
        'info',
        "Le suivi en ligne de vos devis n'est pas encore disponible dans cette version. Pour toute question sur un devis, contactez l'agence."
    );
})();
