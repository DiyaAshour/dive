import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  dotenv.config({path:fileURLToPath(new URL("../../../.env", import.meta.url))});
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { PrismaClient } = await import("../src/generated/prisma/client.ts");
const prisma = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});

const translations = [
  {
    slug:"demo-citadel-house-amman",
    locale:"ar",
    description:"يقع Citadel House Amman في جبل القلعة في عمّان، وهو فندق تجريبي ضمن HandMeKey يُستخدم لاختبار تجربة الحجز وعرض خصائص المنصة. يتميز بموقع قريب من وسط عمّان ومعالمها التاريخية، مع مرافق مناسبة لإقامة مريحة في المدينة.",
  },
];

try {
  for (const translation of translations) {
    const hotel = await prisma.hotel.findUnique({where:{slug:translation.slug},select:{id:true}});
    if (!hotel) continue;
    await prisma.hotelTranslation.upsert({
      where:{hotelId_locale:{hotelId:hotel.id,locale:translation.locale}},
      create:{hotelId:hotel.id,locale:translation.locale,description:translation.description},
      update:{description:translation.description},
    });
  }
  console.log(`Seeded ${translations.length} demo hotel translation(s).`);
} finally {
  await prisma.$disconnect();
}
