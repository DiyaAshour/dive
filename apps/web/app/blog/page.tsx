import { redirect } from "next/navigation";
import { requestLocale } from "@/lib/request-locale";

export default async function BlogIndexPage() {
  const locale = await requestLocale();
  redirect(`/blog/${locale}`);
}
