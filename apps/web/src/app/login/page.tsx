import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SocialAuthPage } from "@/components/auth/social-auth-page";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Sign In | Sightline Console",
  description: "Sign in to the Sightline MVP dashboard.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  return <SocialAuthPage mode="login" />;
}
