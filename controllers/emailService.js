const nodemailer = require('nodemailer');

/**
 * Envía un correo electrónico con un archivo adjunto.
 * @param {string[]} recipients Lista de correos de destino.
 * @param {string} subject Asunto del correo.
 * @param {string} body Cuerpo del correo.
 * @param {string} filePath Ruta del archivo adjunto.
 */
async function sendEmail(recipients, subject, body, filePath) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    try {
        const result = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: recipients,
            subject,
            text: body,
            attachments: [{ filename: 'contract.pdf', path: filePath, contentType: 'application/pdf' }],
        });

        console.log('Email enviado con éxito:', result);
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        throw error;
    }
}

module.exports = sendEmail;
