import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SocialAuthPage } from "@/components/auth/social-auth-page";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Get Started | Sightline Search",
  description: "Create a Sightline Search account and start with launch credits.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  return <SocialAuthPage mode="signup" />;
}
