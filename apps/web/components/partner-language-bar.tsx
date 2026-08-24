import type {Locale} from "@/lib/i18n";
import {LanguageSwitcher} from "./language-switcher";

export function PartnerLanguageBar({locale}: Readonly<{locale: Locale}>) {
  return <div className="partnerMobileLanguage"><LanguageSwitcher locale={locale} compact/></div>;
}
