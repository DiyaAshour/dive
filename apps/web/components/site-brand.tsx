import {getSiteIdentityConfig} from "@platform/server";
import {Brand} from "./brand";

type Props = Readonly<{
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  label?: string;
}>;

export async function SiteBrand(props: Props) {
  const identity = await getSiteIdentityConfig();
  return <Brand
    {...props}
    brandName={identity.brandName}
    logoUrl={identity.logoUrl}
    wordmarkUrl={identity.wordmarkUrl}
    lightLogoUrl={identity.lightLogoUrl}
  />;
}
