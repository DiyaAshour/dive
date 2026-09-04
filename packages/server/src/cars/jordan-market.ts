export type JordanRentalCategory = "Economy" | "Compact" | "Sedan" | "SUV" | "Luxury" | "Family" | "Van" | "Pickup" | "Electric";
export type JordanRentalTransmission = "AUTOMATIC" | "MANUAL";
export type JordanRentalFuel = "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";

export type JordanRentalMarketModel = Readonly<{
  key: string;
  make: string;
  model: string;
  aliases: readonly string[];
  category: JordanRentalCategory;
  bodyType: string;
  seats: number;
  bags: number;
  transmission: JordanRentalTransmission;
  fuel: JordanRentalFuel;
  observedBy: readonly string[];
}>;

/**
 * Jordan rental-market reference list.
 *
 * This is intentionally model-level rather than year/trim-level. Public rental
 * fleet guides frequently advertise "or similar" classes and do not guarantee
 * a model year. Exact HandMeKey visual matching remains make/model/year/trim in
 * CarCatalogVehicle; this registry makes sure partners can still find the broad
 * set of models currently advertised by rental companies operating in Jordan.
 *
 * Sources reviewed on 2026-09-04 include Avis Jordan, Dunya Car Rental,
 * National/Enterprise Jordan, Hertz Jordan, Monte Carlo Rent a Car, Rushmore,
 * Masafat Rental, Fox Rent A Car Jordan, Carwiz Jordan and Eras Car Rental.
 */
export const JORDAN_RENTAL_MARKET_MODELS: readonly JordanRentalMarketModel[] = [
  m("kia-picanto", "Kia", "Picanto", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Avis Jordan", "Dunya", "National/Enterprise", "Rushmore", "Fox"]),
  m("nissan-sunny", "Nissan", "Sunny", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Avis Jordan", "Dunya", "National/Enterprise", "Hertz Jordan", "Rushmore", "Monte Carlo"]),
  m("kia-cerato", "Kia", "Cerato", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Avis Jordan", "National/Enterprise", "Rushmore", "Monte Carlo", "Masafat"]),
  m("toyota-corolla", "Toyota", "Corolla", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "HYBRID", ["Avis Jordan", "Dunya", "National/Enterprise", "Monte Carlo"]),
  m("toyota-camry", "Toyota", "Camry", "Luxury", "Sedan", 5, 3, "AUTOMATIC", "HYBRID", ["Avis Jordan", "National/Enterprise", "Rushmore", "Fox"]),
  m("nissan-x-trail", "Nissan", "X-Trail", "SUV", "SUV", 5, 4, "AUTOMATIC", "PETROL", ["Avis Jordan"]),
  m("toyota-yaris", "Toyota", "Yaris", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Avis Jordan"]),
  m("volkswagen-golf", "Volkswagen", "Golf", "Compact", "Hatchback", 5, 3, "AUTOMATIC", "PETROL", ["Avis Jordan"], ["VW Golf"]),
  m("toyota-rav4", "Toyota", "RAV4", "SUV", "SUV", 5, 3, "AUTOMATIC", "HYBRID", ["Avis Jordan", "National/Enterprise", "Masafat"]),
  m("mercedes-s-class", "Mercedes-Benz", "S-Class", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["Avis Jordan", "National/Enterprise"], ["Mercedes S Class", "Mercedes S400", "S400"]),
  m("bmw-7-series", "BMW", "7 Series", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["Avis Jordan"]),
  m("gmc-yukon", "GMC", "Yukon", "SUV", "Full-size SUV", 7, 5, "AUTOMATIC", "PETROL", ["Avis Jordan"]),

  m("hyundai-eon", "Hyundai", "Eon", "Economy", "Hatchback", 4, 2, "MANUAL", "PETROL", ["Dunya"]),
  m("suzuki-alto", "Suzuki", "Alto", "Economy", "Hatchback", 4, 2, "MANUAL", "PETROL", ["Dunya", "Monte Carlo"]),
  m("peugeot-107", "Peugeot", "107", "Economy", "Hatchback", 4, 1, "MANUAL", "PETROL", ["Dunya", "Monte Carlo"]),
  m("kia-rio", "Kia", "Rio", "Compact", "Sedan", 5, 2, "AUTOMATIC", "PETROL", ["Dunya", "Monte Carlo"]),
  m("hyundai-accent", "Hyundai", "Accent", "Compact", "Sedan", 5, 2, "AUTOMATIC", "PETROL", ["Dunya", "Monte Carlo", "Fox"]),
  m("hyundai-elantra", "Hyundai", "Elantra", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Dunya", "National/Enterprise", "Rushmore", "Monte Carlo"]),
  m("nissan-kicks", "Nissan", "Kicks", "SUV", "Crossover", 5, 2, "AUTOMATIC", "PETROL", ["Dunya", "Masafat"]),
  m("hyundai-tucson", "Hyundai", "Tucson", "SUV", "SUV", 5, 4, "AUTOMATIC", "PETROL", ["Dunya", "Monte Carlo", "Masafat"]),
  m("kia-sportage", "Kia", "Sportage", "SUV", "SUV", 5, 4, "AUTOMATIC", "PETROL", ["Dunya", "National/Enterprise", "Rushmore", "Masafat"]),
  m("hyundai-staria", "Hyundai", "Staria", "Van", "Passenger Van", 8, 6, "AUTOMATIC", "DIESEL", ["Dunya", "National/Enterprise", "Rushmore", "Monte Carlo", "Masafat"]),
  m("hyundai-h1", "Hyundai", "H-1", "Van", "Passenger Van", 9, 6, "AUTOMATIC", "DIESEL", ["Dunya", "National/Enterprise", "Hertz Jordan", "Rushmore", "Monte Carlo"], ["Hyundai H1"]),
  m("hyundai-i20", "Hyundai", "i20", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Dunya", "National/Enterprise", "Monte Carlo"]),
  m("nissan-micra", "Nissan", "Micra", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Dunya"]),
  m("toyota-land-cruiser-prado", "Toyota", "Land Cruiser Prado", "SUV", "4x4 SUV", 7, 5, "AUTOMATIC", "PETROL", ["Dunya", "Monte Carlo"], ["Toyota Prado", "Prado"]),
  m("mitsubishi-pajero", "Mitsubishi", "Pajero", "SUV", "4x4 SUV", 7, 4, "AUTOMATIC", "PETROL", ["Dunya", "Hertz Jordan", "Rushmore", "Monte Carlo"]),
  m("nissan-patrol", "Nissan", "Patrol", "SUV", "4x4 SUV", 7, 5, "AUTOMATIC", "PETROL", ["Dunya", "Hertz Jordan", "Monte Carlo", "Masafat"]),

  m("mitsubishi-attrage", "Mitsubishi", "Attrage", "Economy", "Sedan", 5, 2, "AUTOMATIC", "PETROL", ["Monte Carlo"]),
  m("peugeot-301", "Peugeot", "301", "Compact", "Sedan", 5, 2, "MANUAL", "PETROL", ["Monte Carlo", "Fox"]),
  m("hyundai-i30", "Hyundai", "i30", "Compact", "Hatchback", 5, 3, "AUTOMATIC", "PETROL", ["Monte Carlo"]),
  m("peugeot-308", "Peugeot", "308", "Compact", "Hatchback", 5, 3, "MANUAL", "PETROL", ["Monte Carlo"]),
  m("mitsubishi-lancer", "Mitsubishi", "Lancer", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Monte Carlo"]),
  m("honda-accord", "Honda", "Accord", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["Monte Carlo"]),
  m("kia-optima", "Kia", "Optima", "Luxury", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["National/Enterprise", "Monte Carlo"]),
  m("chevrolet-captiva", "Chevrolet", "Captiva", "SUV", "SUV", 5, 4, "AUTOMATIC", "PETROL", ["Monte Carlo"]),
  m("mitsubishi-outlander", "Mitsubishi", "Outlander", "SUV", "SUV", 7, 4, "AUTOMATIC", "PETROL", ["Monte Carlo", "Masafat"]),

  m("mitsubishi-mirage", "Mitsubishi", "Mirage", "Economy", "Hatchback", 5, 1, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("nissan-versa", "Nissan", "Versa", "Compact", "Sedan", 5, 3, "MANUAL", "PETROL", ["National/Enterprise"]),
  m("hyundai-sonata", "Hyundai", "Sonata", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["National/Enterprise", "Hertz Jordan"]),
  m("bmw-5-series", "BMW", "5 Series", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("hyundai-atos", "Hyundai", "Atos", "Economy", "Hatchback", 5, 1, "MANUAL", "PETROL", ["National/Enterprise"]),
  m("mercedes-c-class", "Mercedes-Benz", "C-Class", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["National/Enterprise"], ["Mercedes C Class"]),
  m("honda-civic", "Honda", "Civic", "Sedan", "Sedan", 5, 2, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("mg-zs", "MG", "ZS", "SUV", "Compact SUV", 5, 4, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("ford-explorer", "Ford", "Explorer", "SUV", "Full-size SUV", 7, 5, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("chevrolet-tahoe", "Chevrolet", "Tahoe", "SUV", "Full-size SUV", 7, 5, "AUTOMATIC", "PETROL", ["National/Enterprise", "Rushmore", "Masafat"]),
  m("mg-hs", "MG", "HS", "SUV", "SUV", 5, 3, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("jetour-t2", "Jetour", "T2", "SUV", "4x4 SUV", 5, 3, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("kia-niro", "Kia", "Niro", "SUV", "Hybrid Crossover", 5, 3, "AUTOMATIC", "HYBRID", ["National/Enterprise", "Masafat"]),
  m("suzuki-jimny", "Suzuki", "Jimny", "SUV", "4x4 SUV", 5, 3, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("jac-m4", "JAC", "M4", "Van", "Passenger Van", 9, 3, "MANUAL", "PETROL", ["National/Enterprise"]),
  m("kia-carnival", "Kia", "Carnival", "Van", "Passenger Van", 8, 6, "AUTOMATIC", "PETROL", ["National/Enterprise"]),
  m("mercedes-v-class", "Mercedes-Benz", "V-Class", "Van", "Premium Passenger Van", 8, 3, "AUTOMATIC", "DIESEL", ["National/Enterprise"], ["Mercedes V Class"]),

  m("suzuki-ciaz", "Suzuki", "Ciaz", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Rushmore"]),
  m("toyota-corolla-cross", "Toyota", "Corolla Cross", "SUV", "Hybrid Crossover", 5, 4, "AUTOMATIC", "HYBRID", ["Rushmore", "Masafat"]),
  m("toyota-chr", "Toyota", "C-HR", "SUV", "Hybrid Crossover", 5, 3, "AUTOMATIC", "HYBRID", ["Rushmore"]),
  m("toyota-land-cruiser", "Toyota", "Land Cruiser", "SUV", "Premium 4x4 SUV", 7, 5, "AUTOMATIC", "PETROL", ["Rushmore"]),
  m("ford-f150", "Ford", "F-150", "Pickup", "Full-size Pickup", 5, 4, "AUTOMATIC", "PETROL", ["Rushmore"]),
  m("hyundai-grand-i10", "Hyundai", "Grand i10", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Rushmore"]),

  m("hyundai-ioniq", "Hyundai", "Ioniq", "Electric", "Hatchback", 5, 3, "AUTOMATIC", "HYBRID", ["Masafat"]),
  m("mitsubishi-asx", "Mitsubishi", "ASX", "SUV", "Compact SUV", 5, 3, "AUTOMATIC", "PETROL", ["Masafat"]),
  m("geely-azkarra", "Geely", "Azkarra", "SUV", "Crossover", 5, 3, "AUTOMATIC", "PETROL", ["Fox"]),
  m("mazda-3", "Mazda", "3", "Compact", "Sedan", 5, 2, "AUTOMATIC", "PETROL", ["Fox"], ["Mazda3"]),
  m("renault-stepway", "Renault", "Stepway", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Fox"]),
  m("mazda-6", "Mazda", "6", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Fox"], ["Mazda6"]),

  m("mahindra-kuv100", "Mahindra", "KUV100", "Economy", "Hatchback", 5, 2, "MANUAL", "PETROL", ["Hertz Jordan"]),
  m("mercedes-e-class", "Mercedes-Benz", "E-Class", "Luxury", "Sedan", 5, 4, "AUTOMATIC", "PETROL", ["Hertz Jordan"], ["Mercedes E200", "E200"]),
  m("citroen-c2", "Citroen", "C2", "Economy", "Hatchback", 4, 2, "MANUAL", "PETROL", ["National/Enterprise"]),

  m("mg-rx5", "MG", "RX5", "SUV", "SUV", 5, 3, "AUTOMATIC", "PETROL", ["Carwiz Jordan"]),
  m("hyundai-i10", "Hyundai", "i10", "Economy", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Carwiz Jordan"]),
  m("peugeot-208", "Peugeot", "208", "Compact", "Hatchback", 5, 2, "AUTOMATIC", "PETROL", ["Carwiz Jordan"]),
  m("mg-5", "MG", "5", "Sedan", "Sedan", 5, 3, "AUTOMATIC", "PETROL", ["Carwiz Jordan"], ["MG5"]),
  m("kia-pegas", "Kia", "Pegas", "Compact", "Sedan", 5, 2, "AUTOMATIC", "PETROL", ["Carwiz Jordan"]),
  m("hyundai-santa-fe", "Hyundai", "Santa Fe", "SUV", "7-seat SUV", 7, 4, "AUTOMATIC", "PETROL", ["Eras Car Rental"]),
];

export function searchJordanRentalMarket(input: {q?: string | undefined; make?: string | undefined; category?: string | undefined; limit?: number | undefined} = {}) {
  const q = normalize(input.q ?? "");
  const make = normalize(input.make ?? "");
  const category = normalize(input.category ?? "");
  const limit = Math.max(1, Math.min(input.limit ?? 60, 100));

  return JORDAN_RENTAL_MARKET_MODELS.filter((vehicle) => {
    if (make && normalize(vehicle.make) !== make) return false;
    if (category && normalize(vehicle.category) !== category) return false;
    if (!q) return true;
    const haystack = normalize([vehicle.make, vehicle.model, vehicle.category, vehicle.bodyType, ...vehicle.aliases].join(" "));
    return haystack.includes(q);
  }).slice(0, limit);
}

export function getJordanRentalMarketSummary() {
  const makes = new Map<string, number>();
  const categories = new Map<string, number>();
  const sources = new Set<string>();
  for (const vehicle of JORDAN_RENTAL_MARKET_MODELS) {
    makes.set(vehicle.make, (makes.get(vehicle.make) ?? 0) + 1);
    categories.set(vehicle.category, (categories.get(vehicle.category) ?? 0) + 1);
    vehicle.observedBy.forEach((source) => sources.add(source));
  }
  return {
    models: JORDAN_RENTAL_MARKET_MODELS.length,
    makes: makes.size,
    sourceCount: sources.size,
    observedAt: "2026-09-04",
    categories: [...categories.entries()].map(([category, models]) => ({category, models})).sort((a, b) => b.models - a.models),
    topMakes: [...makes.entries()].map(([make, models]) => ({make, models})).sort((a, b) => b.models - a.models),
    sources: [...sources].sort(),
  };
}

function m(
  key: string,
  make: string,
  model: string,
  category: JordanRentalCategory,
  bodyType: string,
  seats: number,
  bags: number,
  transmission: JordanRentalTransmission,
  fuel: JordanRentalFuel,
  observedBy: readonly string[],
  aliases: readonly string[] = [],
): JordanRentalMarketModel {
  return {key, make, model, aliases, category, bodyType, seats, bags, transmission, fuel, observedBy};
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}
