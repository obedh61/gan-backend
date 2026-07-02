function buildEmail({ title, contentHtml, t, lang }) {
  // Gmail (and most clients) block inline base64 images.
  // Use a public HTTPS URL for the logo, or leave it empty to skip the image.
  const logoUrl = process.env.EMAIL_LOGO_URL || '';
  const direction = lang === 'he' ? 'rtl' : 'ltr';
  const align = lang === 'he' ? 'right' : 'left';
  const appName = 'Gan Montessori Second Home';
  const hebrewAppName = 'גן מונטסורי סקונד הום';
  const displayName = lang === 'he' ? hebrewAppName : appName;

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f5; font-family: 'Heebo', 'Rubik', 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; direction: ${direction}; text-align: ${align};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4A7B59; padding: 24px 32px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${displayName}" width="48" height="48" style="margin-bottom: 12px; border-radius: 50%; background-color: #ffffff; padding: 4px;">` : ''}
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">${displayName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 20px 0; color: #2e7d32; font-size: 20px; font-weight: 600;">${title}</h2>
              <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                ${contentHtml}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f5; padding: 24px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 8px 0; color: #666666; font-size: 13px;">
                ${displayName}
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                ${lang === 'he' ? 'דוא"ל זה נשלח באופן אוטומטי, אין צורך להשיב.' : 'This is an automated email, please do not reply.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

module.exports = buildEmail;
