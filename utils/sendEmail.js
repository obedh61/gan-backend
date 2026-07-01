const nodemailer = require('nodemailer');

/**
 * Send a transactional email using the configured Gmail account.
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Array}  options.attachments - Nodemailer attachments (optional)
 * @returns {Promise<Object>} nodemailer send result
 */
async function sendEmail({ to, subject, text, html, attachments }) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const result = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
        attachments,
    });

    return result;
}

module.exports = sendEmail;
