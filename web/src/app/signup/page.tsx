import { SignUpForm } from "@/components/portal/sign-up-form";

export const metadata = { title: "Sign up · Kiyos" };

/** Sign-up on the web: the other front door to WhatsApp. */
export default function SignUpPage() {
  return <SignUpForm />;
}
