import { getPublicHotelDetails as getDatabaseHotelDetails } from "./service";
import { getPublicHotelSeoDetails as getDatabaseHotelSeoDetails } from "./seo";
import { getPublicHotelReviews as getDatabaseHotelReviews } from "../reviews/service";
import { getPublicHotelGallery as getDatabaseHotelGallery } from "../media/public-gallery";
import { getDemoHotelDetails, getDemoHotelGallery, getDemoHotelReviews, getDemoHotelSeoDetails } from "./demo-hotel-fallback";

type StayInput = Readonly<{arrival:string;departure:string;adults:number;children:number}>;

export async function getPublicHotelDetails(hotelId:string,stayInput:StayInput,options:Readonly<{trackView?:boolean}>={}) {
  if (hotelId.startsWith("demo-")) {
    try {
      return await getDatabaseHotelDetails(hotelId,stayInput,options);
    } catch (error) {
      const demo=getDemoHotelDetails(hotelId,stayInput);
      if (demo) {
        console.error("Production demo hotel data unavailable; serving built-in demo details",error);
        return demo;
      }
      throw error;
    }
  }
  return getDatabaseHotelDetails(hotelId,stayInput,options);
}

export async function getPublicHotelReviews(hotelId:string,limit=20) {
  if (hotelId.startsWith("demo-")) {
    try {
      return await getDatabaseHotelReviews(hotelId,limit);
    } catch (error) {
      const demo=getDemoHotelReviews(hotelId);
      if (demo) {
        console.error("Production demo reviews unavailable; serving empty verified-review state",error);
        return demo;
      }
      throw error;
    }
  }
  return getDatabaseHotelReviews(hotelId,limit);
}

export async function getPublicHotelSeoDetails(identifier:string) {
  if (identifier.startsWith("demo-")) {
    try {
      return await getDatabaseHotelSeoDetails(identifier);
    } catch (error) {
      const demo=getDemoHotelSeoDetails(identifier);
      if (demo) {
        console.error("Production demo SEO data unavailable; serving built-in demo metadata",error);
        return demo;
      }
      throw error;
    }
  }
  return getDatabaseHotelSeoDetails(identifier);
}

export async function getPublicHotelGallery(identifier:string) {
  if (identifier.startsWith("demo-")) {
    try {
      return await getDatabaseHotelGallery(identifier);
    } catch (error) {
      const demo=getDemoHotelGallery(identifier);
      if (demo) {
        console.error("Production demo gallery unavailable; serving built-in demo gallery",error);
        return demo;
      }
      throw error;
    }
  }
  return getDatabaseHotelGallery(identifier);
}
