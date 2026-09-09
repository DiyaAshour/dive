import "dotenv/config";
import {syncNuiteeHotelContent} from "../src/nuitee/catalog";

const countryCode = (process.argv[2] ?? process.env.NUITEE_CONTENT_SYNC_COUNTRY ?? "JO").trim().toUpperCase();
const maxHotelsArg = Number(process.argv[3] ?? process.env.NUITEE_CONTENT_SYNC_MAX_HOTELS ?? 10000);
const maxHotels = Number.isFinite(maxHotelsArg) && maxHotelsArg > 0 ? Math.floor(maxHotelsArg) : 10000;

const result = await syncNuiteeHotelContent({countryCode, maxHotels});
console.log(JSON.stringify({event: "nuitee-content-sync", ...result}, null, 2));

if (result.failed > 0) process.exitCode = 1;
