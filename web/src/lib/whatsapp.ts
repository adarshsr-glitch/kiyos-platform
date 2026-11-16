/** The Kiyos WhatsApp number, digits with country code. Unset: no WhatsApp links are shown. */
const NUMBER = (process.env.NEXT_PUBLIC_KIYOS_WHATSAPP ?? "").replace(/\D/g, "");

export const whatsappHref = NUMBER ? `https://wa.me/${NUMBER}` : null;
