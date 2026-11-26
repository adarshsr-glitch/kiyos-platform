import { ExpertAuth } from "@/components/case/expert-auth";

export const metadata = { title: "Sign in · Kiyos experts" };

export default function ExpertSignInPage() {
  return <ExpertAuth mode="signin" />;
}
