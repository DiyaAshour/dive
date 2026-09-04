INSERT INTO "CarCatalogVehicle" (
  "id", "slug", "make", "model", "year", "trim", "bodyType", "category", "transmission", "fuel", "seats", "bags", "doors", "provider", "reviewed", "active", "createdAt", "updatedAt"
) VALUES
  ('catalog-toyota-yaris-2026', 'toyota-yaris-2026', 'Toyota', 'Yaris', 2026, NULL, 'Hatchback', 'Economy', 'AUTOMATIC', 'PETROL', 5, 2, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-toyota-corolla-2026', 'toyota-corolla-2026', 'Toyota', 'Corolla', 2026, NULL, 'Sedan', 'Sedan', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-toyota-camry-2026', 'toyota-camry-2026', 'Toyota', 'Camry', 2026, NULL, 'Sedan', 'Sedan', 'AUTOMATIC', 'HYBRID', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-toyota-rav4-2026', 'toyota-rav4-2026', 'Toyota', 'RAV4', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'HYBRID', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-toyota-prado-2026', 'toyota-land-cruiser-prado-2026', 'Toyota', 'Land Cruiser Prado', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'PETROL', 7, 5, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-toyota-hiace-2025', 'toyota-hiace-2025', 'Toyota', 'Hiace', 2025, NULL, 'Van', 'Van', 'AUTOMATIC', 'DIESEL', 12, 8, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-hyundai-accent-2026', 'hyundai-accent-2026', 'Hyundai', 'Accent', 2026, NULL, 'Sedan', 'Economy', 'AUTOMATIC', 'PETROL', 5, 2, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-hyundai-elantra-2026', 'hyundai-elantra-2026', 'Hyundai', 'Elantra', 2026, NULL, 'Sedan', 'Sedan', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-hyundai-tucson-2026', 'hyundai-tucson-2026', 'Hyundai', 'Tucson', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'HYBRID', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-hyundai-santa-fe-2026', 'hyundai-santa-fe-2026', 'Hyundai', 'Santa Fe', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'HYBRID', 7, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-hyundai-staria-2026', 'hyundai-staria-2026', 'Hyundai', 'Staria', 2026, NULL, 'Van', 'Van', 'AUTOMATIC', 'DIESEL', 9, 6, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-kia-picanto-2026', 'kia-picanto-2026', 'Kia', 'Picanto', 2026, NULL, 'Hatchback', 'Economy', 'AUTOMATIC', 'PETROL', 4, 2, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-kia-k4-2026', 'kia-k4-2026', 'Kia', 'K4', 2026, NULL, 'Sedan', 'Sedan', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-kia-sportage-2026', 'kia-sportage-2026', 'Kia', 'Sportage', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'HYBRID', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-kia-sorento-2026', 'kia-sorento-2026', 'Kia', 'Sorento', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'HYBRID', 7, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-kia-carnival-2026', 'kia-carnival-2026', 'Kia', 'Carnival', 2026, NULL, 'Van', 'Van', 'AUTOMATIC', 'PETROL', 8, 5, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-nissan-sunny-2026', 'nissan-sunny-2026', 'Nissan', 'Sunny', 2026, NULL, 'Sedan', 'Economy', 'AUTOMATIC', 'PETROL', 5, 2, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-nissan-sentra-2026', 'nissan-sentra-2026', 'Nissan', 'Sentra', 2026, NULL, 'Sedan', 'Sedan', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-nissan-xtrail-2026', 'nissan-x-trail-2026', 'Nissan', 'X-Trail', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'HYBRID', 7, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-nissan-patrol-2026', 'nissan-patrol-2026', 'Nissan', 'Patrol', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 7, 5, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-mitsubishi-attrage-2025', 'mitsubishi-attrage-2025', 'Mitsubishi', 'Attrage', 2025, NULL, 'Sedan', 'Economy', 'AUTOMATIC', 'PETROL', 5, 2, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-mitsubishi-asx-2025', 'mitsubishi-asx-2025', 'Mitsubishi', 'ASX', 2025, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'PETROL', 5, 3, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-mitsubishi-pajero-sport-2025', 'mitsubishi-pajero-sport-2025', 'Mitsubishi', 'Pajero Sport', 2025, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'DIESEL', 7, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-mitsubishi-l200-2025', 'mitsubishi-l200-2025', 'Mitsubishi', 'L200', 2025, NULL, 'Pickup', 'Pickup', 'AUTOMATIC', 'DIESEL', 5, 2, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-ford-territory-2026', 'ford-territory-2026', 'Ford', 'Territory', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'PETROL', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-ford-everest-2026', 'ford-everest-2026', 'Ford', 'Everest', 2026, NULL, 'SUV', 'SUV', 'AUTOMATIC', 'DIESEL', 7, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-ford-ranger-2026', 'ford-ranger-2026', 'Ford', 'Ranger', 2026, NULL, 'Pickup', 'Pickup', 'AUTOMATIC', 'DIESEL', 5, 2, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-ford-mustang-2026', 'ford-mustang-2026', 'Ford', 'Mustang', 2026, NULL, 'Coupe', 'Luxury', 'AUTOMATIC', 'PETROL', 4, 2, 2, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-bmw-3-320i-2026', 'bmw-3-series-320i-2026', 'BMW', '3 Series', 2026, '320i', 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-bmw-3-330i-2026', 'bmw-3-series-330i-2026', 'BMW', '3 Series', 2026, '330i', 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-bmw-3-m340i-2026', 'bmw-3-series-m340i-2026', 'BMW', '3 Series', 2026, 'M340i', 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-bmw-5-2026', 'bmw-5-series-2026', 'BMW', '5 Series', 2026, NULL, 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-bmw-x1-2026', 'bmw-x1-2026', 'BMW', 'X1', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-bmw-x3-2026', 'bmw-x3-2026', 'BMW', 'X3', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-bmw-x5-2026', 'bmw-x5-2026', 'BMW', 'X5', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-mercedes-c-class-2026', 'mercedes-benz-c-class-2026', 'Mercedes-Benz', 'C-Class', 2026, NULL, 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-mercedes-e-class-2026', 'mercedes-benz-e-class-2026', 'Mercedes-Benz', 'E-Class', 2026, NULL, 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-mercedes-glc-2026', 'mercedes-benz-glc-2026', 'Mercedes-Benz', 'GLC', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-mercedes-gle-2026', 'mercedes-benz-gle-2026', 'Mercedes-Benz', 'GLE', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-audi-a4-2026', 'audi-a4-2026', 'Audi', 'A4', 2026, NULL, 'Sedan', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-audi-q3-2026', 'audi-q3-2026', 'Audi', 'Q3', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 3, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-audi-q5-2026', 'audi-q5-2026', 'Audi', 'Q5', 2026, NULL, 'SUV', 'Luxury', 'AUTOMATIC', 'PETROL', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('catalog-tesla-model-3-2026', 'tesla-model-3-2026', 'Tesla', 'Model 3', 2026, NULL, 'Sedan', 'Electric', 'AUTOMATIC', 'ELECTRIC', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-tesla-model-y-2026', 'tesla-model-y-2026', 'Tesla', 'Model Y', 2026, NULL, 'SUV', 'Electric', 'AUTOMATIC', 'ELECTRIC', 5, 4, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-byd-dolphin-2026', 'byd-dolphin-2026', 'BYD', 'Dolphin', 2026, NULL, 'Hatchback', 'Electric', 'AUTOMATIC', 'ELECTRIC', 5, 2, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-byd-atto3-2026', 'byd-atto-3-2026', 'BYD', 'Atto 3', 2026, NULL, 'SUV', 'Electric', 'AUTOMATIC', 'ELECTRIC', 5, 3, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-byd-seal-2026', 'byd-seal-2026', 'BYD', 'Seal', 2026, NULL, 'Sedan', 'Electric', 'AUTOMATIC', 'ELECTRIC', 5, 3, 4, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-dongfeng-nammi-01-2025', 'dongfeng-nammi-01-2025', 'Dongfeng', 'Nammi 01', 2025, NULL, 'Hatchback', 'Electric', 'AUTOMATIC', 'ELECTRIC', 5, 2, 5, 'MANUAL', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
