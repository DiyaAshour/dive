import {getNuiteeHotelDetails,NUITEE_PAYMENT_CURRENCY} from "@platform/server";

export const dynamic="force-dynamic";

export async function GET(){
  const hotel=await getNuiteeHotelDetails("lp19ef7",{
    destination:"Amman",
    arrival:"2026-09-10",
    departure:"2026-09-11",
    adults:2,
    children:0,
    guestNationality:"JO",
    currency:NUITEE_PAYMENT_CURRENCY,
  });
  if(!hotel)return Response.json({error:"hotel unavailable"},{status:404});
  return Response.json({
    hotel:{id:hotel.providerHotelCode,name:hotel.name},
    rooms:hotel.rooms.map((room)=>({id:room.id,name:room.name,photos:room.photos.map((photo)=>photo.url)})),
    offers:hotel.offers.map((offer)=>({roomName:offer.roomName,mappedRoomId:offer.mappedRoomId,boardCode:offer.boardCode,boardName:offer.boardName})),
  },{headers:{"cache-control":"no-store"}});
}
