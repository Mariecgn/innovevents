const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateQuotePdf(
    quote,
    items
) {
    const dir = path.join(
        __dirname,
        '../../generated'
    );

    fs.mkdirSync(dir, {
        recursive: true
    });

    const file = path.join(
        dir,
        `devis-${quote.id}.pdf`
    );

    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(file));

    doc
        .fontSize(20)
        .text("Innov'Events - Devis");

    doc.moveDown();

    doc.text(`Devis #${quote.id}`);

    items.forEach((item) => {
        doc.text(
            `${item.label} : ${item.amount_ht} EUR HT`
        );
    });

    doc.moveDown();

    doc.text(
        `Total HT : ${quote.total_ht} EUR`
    );

    doc.text(
        `TVA : ${quote.tva} EUR`
    );

    doc.text(
        `Total TTC : ${quote.total_ttc} EUR`
    );

    doc.end();

    return file;
}

module.exports = {
    generateQuotePdf
};