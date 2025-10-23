const PDFDocument = require('pdfkit');

exports.buildPDF = (dataCallback, endCallback) => {
    const doc = new PDFDocument();
    doc.on('data', dataCallback)
    doc.on('end', endCallback)
    doc.text('hello');

     
    // doc.image(signature, {
    //     fit: [250, 300],
    //     align: 'center',
    //     valign: 'center'
    //     });
    doc.end();
}