/**
 * The Kiyos WhatsApp number, digits with country code. With a number configured,
 * links open WhatsApp itself. Without one (the prototype), they open the same
 * thread inside the app at /portal/whatsapp.
 */
const NUMBER = (process.env.NEXT_PUBLIC_KIYOS_WHATSAPP ?? "").replace(/\D/g, "");

export const whatsappHref = NUMBER ? `https://wa.me/${NUMBER}` : "/portal/whatsapp";
export const whatsappTarget = NUMBER ? "_blank" : undefined;
