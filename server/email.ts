// Email service using Resend integration
// Reference: connection:conn_resend_01KA2C1AT6M2JMN97FVHBJEA62
import { Resend } from 'resend';
import crypto from 'crypto';

const DEFAULT_FROM_EMAIL = 'Panel Trenera <noreply@paneltrenera.pl>';

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  return {
    client: new Resend(apiKey),
    fromEmail: DEFAULT_FROM_EMAIL
  };
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

interface SendVerificationEmailParams {
  email: string;
  firstName: string;
  token: string;
}

export async function sendVerificationEmail({ email, firstName, token }: SendVerificationEmailParams): Promise<boolean> {
  try {
    console.log('[EMAIL] Starting to send verification email to:', email);
    const { client, fromEmail } = await getResendClient();
    console.log('[EMAIL] Using from address:', fromEmail);
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DEPLOYMENT_URL 
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
      : 'http://localhost:5000';
    
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    
    const result = await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Potwierdź swój adres email - Panel Trenera',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potwierdź email</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0d9488; margin: 0; font-size: 28px;">Panel Trenera</h1>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Cześć ${firstName}!</h2>
            
            <p>Dziękujemy za rejestrację w Panel Trenera. Aby aktywować swoje konto, potwierdź swój adres email klikając poniższy przycisk:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background-color: #0d9488; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Potwierdź email
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:<br>
              <a href="${verificationUrl}" style="color: #0d9488; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="color: #64748b; font-size: 14px;">
              Link wygasa za 24 godziny.
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Jeśli nie rejestrowałeś/aś się w Panel Trenera, zignoruj tę wiadomość.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Panel Trenera - Polska marka<br>
              © ${new Date().getFullYear()} Wszelkie prawa zastrzeżone
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Cześć ${firstName}!

Dziękujemy za rejestrację w Panel Trenera. Aby aktywować swoje konto, potwierdź swój adres email klikając poniższy link:

${verificationUrl}

Link wygasa za 24 godziny.

Jeśli nie rejestrowałeś/aś się w Panel Trenera, zignoruj tę wiadomość.

Panel Trenera - Polska marka
© ${new Date().getFullYear()} Wszelkie prawa zastrzeżone
      `
    });
    
    console.log('[EMAIL] Verification email sent to:', email, 'Result:', result);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    return false;
  }
}
