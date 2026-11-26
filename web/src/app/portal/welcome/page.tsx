import { redirect } from "next/navigation";

/** The old scan landing page is gone; anything still pointing here opens the customer's home. */
export default function WelcomePage() {
  redirect("/portal");
}
