const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Genera un archivo PDF con el contenido detallado del contrato y regulaciones.
 * @param {Object} data - Datos del contrato.
 * @param {string} outputPath - Ruta de salida del archivo PDF.
 */
function createDetailedPDF(data, outputPath) {
    const doc = new PDFDocument();

    try {
        const {
            firstname, lastname, signature, childsname, teudatZeut,
            contact, bank, numBank, startDate, babyPrice
        } = data;

        let anoInicio = startDate.getFullYear()
        let mesInicio = startDate.getMonth()
        let diaInicio = startDate.getDate()
        let anoFinal = anoInicio

        if((mesInicio+1) > 8) 
            anoFinal++

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Configuración del logo
        const logoPath = `${__dirname}/Picture1.png`;
        const logoWidth = 100, logoHeight = 150;

        doc.image(logoPath, doc.page.width - logoWidth - 10, 10, { width: logoWidth, height: logoHeight });

        // Título principal
        doc.fontSize(20).text('CONTRACT', { align: 'center' });
        doc.moveDown(2);

        // Detalles del contrato
        doc.fontSize(12).text('This contract is entered into between the following parties:', {
            align: 'left'
        });
        doc.moveDown(1);

        doc.text(`Custormer name: ${firstname} ${lastname}`, {
            align: 'left'
        });
        doc.text('Service provider name: Gan Montessori Second Home', {
            align: 'left'
        });
        doc.text(`Start date: ${diaInicio}/${mesInicio+1}/${anoInicio}`, {
            align: 'left'
        });
        doc.text(`End date: 08/08/${anoFinal}`, {
            align: 'left'
        });
        doc.moveDown(2);

        // Términos del contrato
        doc.text('General Regulations :', {
            align: 'left',
            underline: true
        });
        doc.moveDown(1);

        doc.text(
            '1. Activity Dates: The number of days and hours of operation in the kindergarten, is determined according to the days of operation except for minor changes. '
        );
        doc.moveDown(1);

        doc.text(
            '2. Hours of operation of the kindergarten from sunday - thursday, from 7:30 am- 4:00 pm. On friday is from 8:00 am- 12:00pm, in the winter is until 11:30 am. '
        );
        doc.moveDown(1);

        doc.text(
            '3. The first days of operation that will be gradual; for the first day: 2 hours, for the second day: 3 hours, for the third day: fours and a half, and then it will be for the whole day for the rest of the time. '
        );
        doc.moveDown(1);

        doc.text(
            '4. Diet: The children will receive 2 healthy and nutritious meals in accordance with their development. Children will receive two meals (Breakfast and Lunch and a snack when they wake up from their afternoon nap.) They can bring a snack from home if you want them to have a snack in the morning, or if they come very early in the morning since breakfast is at 8:30.'
        );
        doc.moveDown(1);

        doc.text(
            '5. Care for a sick child|baby:\n • Parents should not send their sick child|baby to gan; In the event of occurrence, there will be a text message sent to parents to let them know that they have to come as soon as possible.\n • A child|baby who is sent home due to fever|diarrhea|vomiting|eye infectation, will remain in his home for 24 hours supervision. His return to kindergarten is made possible with written permission from his pediatrician that he feels good and is able to return. A child will not receive medication from the kindergarten at all. '
        );
        doc.moveDown(2);

        // Firma
        // doc.text('Firmas:', { underline: true });
        doc.moveDown(1);

        // Espacio para la firma del cliente
        doc.text('Client signature:', { align: 'left' });
        // doc.image('firma_cliente.png', { fit: [100, 50], align: 'left' });  // Añadir imagen de firma del cliente
        
    

        const base64Image = signature.split(',')[1]
        const imageBuffer = Buffer.from(base64Image, 'base64')
        doc.image(imageBuffer, {fit: [150, 100], align: 'left'} );
        doc.moveDown(2);

        doc.addPage()

        doc.moveDown(1);

        doc.text(
            `6.  Collection and Payments:\n · The yearly payment will be every first of the month, the last payment will be on September 01 2024 to August 01 2025. The monthly payment is: ${babyPrice.toLocaleString('en')} shekels.\n · Parents who wish to remove the child from kindergarten will inform us a month prior to the departure in writing.\n · In the event that the parents have not been informed a month earlier, the parents will pay another month from the day the child leaves the kindergarten.\n · If the Parents decided 2 months before the end of the school year to leave the gan he must pay the remaining months of the contract or find a replacement.\n · Insurance: The kindergarten is insured by child insurance and third party insurance.`
        );
        doc.moveDown(2);

        doc.text('RULES & REGULATIONS  :', {
            align: 'left',
            underline: true
        });
        doc.moveDown(1);

        doc.text(
            '1. Arrive time: The gan normally starts at 7:30 a.m. but you can bring your child until 8:30 if you want to have breakfast at the gan. Since breakfast is served from 8:30 to 9:00 to the children who arrive on time. If you bring your child after 9:00, they must come already eaten. At 9:00, tefila is done for the groups of 1 to 3 years old. The babies at that time take their morning nap. It is very important that your child comes on time so we don\'t have interruptions and we can adapt everyone to the same daily routine. The latest that a child will be allowed to arrive is 9:30. After that time, entry will not be allowed, unless notified in advanced and explaining why he will arrive at 9:30. If you have a medical appointment, let me know a day before and you can arrive after finishing your medical appointment or if it\'s tipat chalav as well.'
        );
        doc.moveDown(1);

        doc.text(
            '2. Closing time: the gan ends from Sunday to Thursday at 3:55, and on Fridays 11:25 (winter) and summer 11:55 (summer). The parent who is late must pay the time of delay to the person who stays with his child. '
        );
        doc.moveDown(4);

        doc.text('Client signature:', { align: 'left' });

        doc.image(imageBuffer, {fit: [100, 50], align: 'left'} );
        doc.moveDown(2);

        doc.addPage()

        doc.text(
            `3.  Payment: The date of payment is always the first of the month. If any parent has a problem paying on time, please let me know ahead of time. Payments will be by check only (12 checks). The first payment will be on September 1st and the last on August 1st. Even though the end of the school year ends on August 8th, you still have to pay for the whole month of August ( vacations ). After the 8th, the gan offers a summer day camp in which is an additional cost( optional). The first payment on September 1st will be ${babyPrice.toLocaleString('en')} nis If you prefer to pay by bank transfer, you will have to give a deposit check for the amount of ${babyPrice.toLocaleString('en')}. If you want to close the contract for the school year, you will have to pay the registration fee of 1200 shekels. It includes the registration plus the 12 checks or a security check if you prefer to do it by bank transfer. The 1200 is for the insurance, the purchase of material during the year, the chagim, the purchase of new toys, and gifts for the chagim or activities during the school year.For every day of delay in payment, there will be a penalized fee of 100 shekels. You have until the 10th of each month to pay without penalization. The Payment; of the gan is ${(babyPrice*12).toLocaleString('en')} Which are divided into 12 payments of ${babyPrice.toLocaleString('en')} calc of which is also divided into 2 parts for the vacation payment (August) The children who enter must pay the following percentage according to the month of entry to the gan:\n • September to February ${babyPrice.toLocaleString('en')} 100% \n • March to August ${(babyPrice*0.75).toLocaleString('en')} 75%`
        );
        doc.moveDown(1);

        doc.text(
            '4. Message: Please message me during the day from 1:30 to 3:00 PM (sleeping time). If you have any questions or concerns about your child/ baby , we ask that you do it at the time given to you before in order for us to provide the care and attention that each child/baby deserves. If there is a personal matter in which you want to come and talk to me about, we ask that you come 15 minutes before closing time. Please feel free to contact me. '
        );
        doc.moveDown(1);

        doc.text(
            '5. Toys: The gan is not responsable for any toys that is brought from home so we ask to not bring them to avoid any misunderstandings. Thank you so much for your cooperation and any doubt you might have please let me know. '
        );
        doc.moveDown(4);

        doc.text('Client signature:', { align: 'left' });

        doc.image(imageBuffer, {fit: [100, 50], align: 'left'} );
        doc.moveDown(2);

        doc.addPage()

        // Añadir título al documento
        doc.fontSize(20).text('REGISTRATION', {
            align: 'center',
        });

        // Espacio entre el título y el primer campo
        doc.moveDown(2);

        // Añadir y rellenar el campo de texto para "Nombre"
        doc.fontSize(12).text('Child\'s Name:', {
            continued: true,
        });
        doc.text(` ${childsname}`, { underline: true });
        doc.moveDown(1);

        // Añadir y rellenar el campo de texto para "Correo electrónico"
        doc.text('Teudat Zeut:', {
            continued: true,
        });
        doc.text(` ${teudatZeut}`, { underline: true });
        doc.moveDown(1);

        // Añadir y rellenar el campo de texto para "Teléfono"
        doc.text('Phone Number:', {
            continued: true,
        });
        doc.text(` ${contact}`, { underline: true });
        doc.moveDown(1);

        doc.text('Bank:', {
            continued: true,
        });
        doc.text(` ${bank}`, { underline: true });
        doc.moveDown(1);

        doc.text('Bank account:', {
            continued: true,
        });
        doc.text(` ${numBank}`, { underline: true });
        doc.moveDown(1);

        doc.moveDown(2);

        // Espacio para la firma del cliente
        doc.text('Client signature:', { align: 'left' });
        doc.image(imageBuffer, {fit: [100, 50], align: 'left'} );
        doc.moveDown(2);
        // Finalización del documento
        doc.end();

        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve(outputPath));
            writeStream.on('error', reject);
        });

    } catch (error) {
        throw new Error(`Error al crear el PDF: ${error.message}`);
    }
}

module.exports = createDetailedPDF;
