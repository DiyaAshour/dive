import { redirect } from "next/navigation";
import { requestLocale } from "@/lib/request-locale";

export default async function RewardsIndexPage() {
  const locale = await requestLocale();
  redirect(`/rewards/${locale}`);
}
