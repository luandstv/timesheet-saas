import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/dashboard");
}
