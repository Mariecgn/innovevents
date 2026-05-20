const API = '/api';

function token() {
    return localStorage.getItem('token');
}

async function api(
    path,
    options = {}
) {
    options.headers = {
        ...(options.headers || {}),
        'Content-Type': 'application/json'
    };

    if (token()) {
        options.headers.Authorization =
            'Bearer ' + token();
    }

    const res = await fetch(
        API + path,
        options
    );

    const data = await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            data.message || 'Erreur'
        );
    }

    return data;
}