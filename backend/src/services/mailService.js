async function sendMail({
    to,
    subject,
    text
}) {
    console.log('[MAIL MOCK]', {
        to,
        subject,
        text
    });

    return true;
}

module.exports = {
    sendMail
};