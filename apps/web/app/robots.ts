import type {MetadataRoute} from "next";
import {siteUrl} from "@/lib/site-url";

export default function robots():MetadataRoute.Robots{
  return {rules:[{userAgent:"*",allow:"/",disallow:["/admin/","/api/","/account/","/checkout/","/hotel-dashboard/","/trips/","/login/"]}],sitemap:siteUrl("/sitemap.xml"),host:siteUrl()};
}
