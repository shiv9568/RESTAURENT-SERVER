import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const sendSystemAlert = async (error: any) => {
    const subject = `🚨 System Alert: ${error.message || 'Unknown Error'}`;
    const text = `
    System Error Detected!
    
    Message: ${error.message}
    Service: ${error.service || 'Unknown'}
    Time: ${new Date().toLocaleString()}
    
    Details:
    ${JSON.stringify(error.details, null, 2)}
    `;

    // Hardcoded for now as requested, but ideally from env or settings
    const adminEmail = 'shivanshbhatia9568@gmail.com';

    await sendEmail(adminEmail, subject, text);
};
