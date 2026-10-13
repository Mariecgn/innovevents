const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '../../generated');

function pdfPath(quoteId) {
    return path.join(GENERATED_DIR, `devis-${Number(quoteId)}.pdf`);
}

function money(value) {
    const [int, dec] = (Number(value) || 0).toFixed(2).split('.');

    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} €`;
}

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date
        .toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        .replace(/[\u202f\u00a0]/g, ' ');
}

function drawHeader(doc, quote, left, right) {
    doc.font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#3f2c1e')
        .text("Innov'Events", left, 50);

    doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#5f5851')
        .text('Agence événementielle', left, 78);

    doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#1e1e24')
        .text(`Devis n° ${quote.id}`, left, 50, {
            width: right - left,
            align: 'right'
        });

    doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#5f5851')
        .text(
            `Émis le ${formatDate(quote.created_at || new Date())}`,
            left,
            76,
            { width: right - left, align: 'right' }
        );

    doc.moveTo(left, 104)
        .lineTo(right, 104)
        .lineWidth(1.5)
        .strokeColor('#946b4b')
        .stroke();
}

function drawParties(doc, client, event, left, right, y) {
    const half = (right - left) / 2;

    doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#946b4b')
        .text('CLIENT', left, y)
        .text('ÉVÉNEMENT', left + half, y);

    const clientLines = [
        client.company_name,
        [client.firstname, client.lastname].filter(Boolean).join(' '),
        client.email,
        client.address
    ].filter(Boolean);

    const eventLines = [
        event.name,
        event.start_at ? formatDate(event.start_at) : '',
        event.location
    ].filter(Boolean);

    doc.font('Helvetica').fontSize(11).fillColor('#1e1e24');

    doc.text(clientLines.join('\n'), left, y + 16, { width: half - 20 });
    const clientBottom = doc.y;

    doc.text(eventLines.join('\n'), left + half, y + 16, { width: half });

    return Math.max(clientBottom, doc.y) + 24;
}

function drawTable(doc, items, left, right, startY) {
    const amountWidth = 120;
    const labelWidth = right - left - amountWidth;
    let y = startY;

    doc.rect(left, y, right - left, 26).fill('#f3e9de');

    doc.fillColor('#3f2c1e')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('DÉSIGNATION', left + 10, y + 9, { width: labelWidth - 20 })
        .text('MONTANT HT', left + labelWidth, y + 9, {
            width: amountWidth - 10,
            align: 'right'
        });

    y += 26;

    doc.font('Helvetica').fontSize(11).fillColor('#1e1e24');

    items.forEach((item) => {
        const label = String(item.label);
        const height =
            Math.max(doc.heightOfString(label, { width: labelWidth - 20 }), 14) + 16;

        if (y + height > doc.page.height - 170) {
            doc.addPage();
            y = doc.page.margins.top;
            doc.font('Helvetica').fontSize(11).fillColor('#1e1e24');
        }

        doc.text(label, left + 10, y + 8, { width: labelWidth - 20 });
        doc.text(money(item.amount_ht), left + labelWidth, y + 8, {
            width: amountWidth - 10,
            align: 'right'
        });

        y += height;

        doc.moveTo(left, y)
            .lineTo(right, y)
            .lineWidth(0.7)
            .strokeColor('#e7ded3')
            .stroke();
    });

    return y;
}

function drawTotals(doc, quote, right, startY) {
    const boxWidth = 250;
    const x = right - boxWidth;
    let y = startY + 18;

    const row = (label, value) => {
        doc.font('Helvetica').fontSize(11).fillColor('#1e1e24');
        doc.text(label, x, y, { width: 120 });
        doc.text(money(value), x + 120, y, { width: boxWidth - 130, align: 'right' });
        y += 22;
    };

    row('Total HT', quote.total_ht);
    row('TVA (20 %)', quote.tva);

    doc.rect(x - 10, y - 2, boxWidth + 10, 30).fill('#3f2c1e');

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff');
    doc.text('Total TTC', x, y + 7, { width: 120 });
    doc.text(money(quote.total_ttc), x + 120, y + 7, {
        width: boxWidth - 130,
        align: 'right'
    });
}

// Le fichier est entièrement écrit quand la promesse est résolue.
async function generateQuotePdf(quote, items, context = {}) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });

    const file = pdfPath(quote.id);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(file);

    const finished = new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    doc.pipe(stream);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    drawHeader(doc, quote, left, right);

    const afterParties = drawParties(
        doc,
        context.client || {},
        context.event || {},
        left,
        right,
        126
    );

    const afterTable = drawTable(doc, items, left, right, afterParties);

    if (afterTable > doc.page.height - 170) {
        doc.addPage();
        drawTotals(doc, quote, right, doc.page.margins.top);
    } else {
        drawTotals(doc, quote, right, afterTable);
    }

    doc.end();
    await finished;

    return file;
}

module.exports = {
    generateQuotePdf,
    pdfPath
};
