(function () {
    const section = document.getElementById('home-events');
    const list = document.getElementById('home-events-list');

    bindImageFallback(list);

    api('/events', { auth: false })
        .then((rows) => {
            const now = new Date();

            const upcoming = (Array.isArray(rows) ? rows : [])
                .filter((e) => {
                    const end = toDate(e.end_at) || toDate(e.start_at);
                    return end && end >= now;
                })
                .sort((a, b) => toDate(a.start_at) - toDate(b.start_at))
                .slice(0, 3);

            if (!upcoming.length) return;

            list.innerHTML = upcoming.map(renderEventCard).join('');
            section.hidden = false;
        })
        .catch(() => {
            /* section facultative : on la laisse masquée si l'API est indisponible */
        });
})();
