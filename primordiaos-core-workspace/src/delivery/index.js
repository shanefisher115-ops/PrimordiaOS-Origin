import nodemailer from 'nodemailer';

export class DeliveryEngine {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendApiKey(email, apiKey, productId) {
    console.log('[Delivery] Sending API key to:', email);

    const message = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: Your PrimordiaOS Access Key,
      text: Your access key for  is:\n\n\n\nThank you for your purchase.,
    };

    await this.transporter.sendMail(message);

    console.log('[Delivery] Email delivered to:', email);
  }
}

export const deliveryEngine = new DeliveryEngine();
