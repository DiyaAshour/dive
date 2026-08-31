import type {GuestLocale} from "./guest-market";

type SearchUiCopy=Readonly<{
  destinationMatched:string;
  unavailableTitle:string;
  unavailableBody:string;
  sponsored:string;
  showMore:string;
  amenities:Readonly<Record<string,string>>;
}>;

const EN_AMENITIES={WIFI:"Wi-Fi",PARKING:"Parking",POOL:"Pool",GYM:"Gym",BREAKFAST:"Breakfast"};

const COPY:Record<GuestLocale,SearchUiCopy>={
  en:{destinationMatched:"Destination matched",unavailableTitle:"Search is temporarily unavailable",unavailableBody:"Hotel data could not be reached right now. Please try again shortly.",sponsored:"Sponsored",showMore:"Show more hotels",amenities:EN_AMENITIES},
  ar:{destinationMatched:"تم فهم الوجهة",unavailableTitle:"البحث غير متاح مؤقتًا",unavailableBody:"تعذر الوصول إلى بيانات الفنادق الآن. حاول مرة أخرى بعد قليل.",sponsored:"مموّل",showMore:"عرض المزيد من الفنادق",amenities:{WIFI:"واي فاي",PARKING:"مواقف سيارات",POOL:"مسبح",GYM:"نادي رياضي",BREAKFAST:"إفطار"}},
  zh:{destinationMatched:"已匹配目的地",unavailableTitle:"搜索暂时不可用",unavailableBody:"目前无法访问酒店数据，请稍后再试。",sponsored:"推广",showMore:"查看更多酒店",amenities:{WIFI:"无线网络",PARKING:"停车场",POOL:"游泳池",GYM:"健身房",BREAKFAST:"早餐"}},
  fr:{destinationMatched:"Destination reconnue",unavailableTitle:"La recherche est temporairement indisponible",unavailableBody:"Les données des hôtels sont momentanément inaccessibles. Réessayez dans quelques instants.",sponsored:"Sponsorisé",showMore:"Afficher plus d’hôtels",amenities:{WIFI:"Wi-Fi",PARKING:"Parking",POOL:"Piscine",GYM:"Salle de sport",BREAKFAST:"Petit-déjeuner"}},
  de:{destinationMatched:"Reiseziel erkannt",unavailableTitle:"Suche vorübergehend nicht verfügbar",unavailableBody:"Hoteldaten sind derzeit nicht erreichbar. Bitte versuchen Sie es gleich erneut.",sponsored:"Gesponsert",showMore:"Mehr Hotels anzeigen",amenities:{WIFI:"WLAN",PARKING:"Parkplatz",POOL:"Pool",GYM:"Fitnessraum",BREAKFAST:"Frühstück"}},
  es:{destinationMatched:"Destino reconocido",unavailableTitle:"La búsqueda no está disponible temporalmente",unavailableBody:"No se puede acceder a los datos de hoteles ahora. Inténtalo de nuevo en unos instantes.",sponsored:"Patrocinado",showMore:"Mostrar más hoteles",amenities:{WIFI:"Wi-Fi",PARKING:"Aparcamiento",POOL:"Piscina",GYM:"Gimnasio",BREAKFAST:"Desayuno"}},
  it:{destinationMatched:"Destinazione riconosciuta",unavailableTitle:"Ricerca temporaneamente non disponibile",unavailableBody:"I dati degli hotel non sono raggiungibili al momento. Riprova tra poco.",sponsored:"Sponsorizzato",showMore:"Mostra altri hotel",amenities:{WIFI:"Wi-Fi",PARKING:"Parcheggio",POOL:"Piscina",GYM:"Palestra",BREAKFAST:"Colazione"}},
  tr:{destinationMatched:"Destinasyon eşleşti",unavailableTitle:"Arama geçici olarak kullanılamıyor",unavailableBody:"Otel verilerine şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.",sponsored:"Sponsorlu",showMore:"Daha fazla otel göster",amenities:{WIFI:"Wi-Fi",PARKING:"Otopark",POOL:"Havuz",GYM:"Spor salonu",BREAKFAST:"Kahvaltı"}},
  ru:{destinationMatched:"Направление распознано",unavailableTitle:"Поиск временно недоступен",unavailableBody:"Данные отелей сейчас недоступны. Повторите попытку немного позже.",sponsored:"Реклама",showMore:"Показать больше отелей",amenities:{WIFI:"Wi-Fi",PARKING:"Парковка",POOL:"Бассейн",GYM:"Фитнес-зал",BREAKFAST:"Завтрак"}},
  ja:{destinationMatched:"目的地を認識しました",unavailableTitle:"検索は一時的に利用できません",unavailableBody:"現在ホテルデータにアクセスできません。しばらくしてからもう一度お試しください。",sponsored:"スポンサー",showMore:"ホテルをさらに表示",amenities:{WIFI:"Wi-Fi",PARKING:"駐車場",POOL:"プール",GYM:"ジム",BREAKFAST:"朝食"}},
  ko:{destinationMatched:"목적지가 확인되었습니다",unavailableTitle:"검색을 일시적으로 사용할 수 없습니다",unavailableBody:"현재 호텔 데이터에 접근할 수 없습니다. 잠시 후 다시 시도해 주세요.",sponsored:"스폰서",showMore:"호텔 더 보기",amenities:{WIFI:"Wi-Fi",PARKING:"주차",POOL:"수영장",GYM:"피트니스 센터",BREAKFAST:"조식"}},
  hi:{destinationMatched:"गंतव्य मिल गया",unavailableTitle:"खोज अस्थायी रूप से उपलब्ध नहीं है",unavailableBody:"अभी होटल डेटा उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।",sponsored:"प्रायोजित",showMore:"और होटल दिखाएँ",amenities:{WIFI:"वाई-फाई",PARKING:"पार्किंग",POOL:"पूल",GYM:"जिम",BREAKFAST:"नाश्ता"}},
  pt:{destinationMatched:"Destino identificado",unavailableTitle:"A pesquisa está temporariamente indisponível",unavailableBody:"Os dados dos hotéis não estão acessíveis no momento. Tente novamente em instantes.",sponsored:"Patrocinado",showMore:"Mostrar mais hotéis",amenities:{WIFI:"Wi-Fi",PARKING:"Estacionamento",POOL:"Piscina",GYM:"Academia",BREAKFAST:"Café da manhã"}},
  id:{destinationMatched:"Destinasi dikenali",unavailableTitle:"Pencarian sementara tidak tersedia",unavailableBody:"Data hotel sedang tidak dapat diakses. Silakan coba lagi sebentar lagi.",sponsored:"Bersponsor",showMore:"Tampilkan hotel lainnya",amenities:{WIFI:"Wi-Fi",PARKING:"Parkir",POOL:"Kolam renang",GYM:"Pusat kebugaran",BREAKFAST:"Sarapan"}},
  th:{destinationMatched:"พบจุดหมายแล้ว",unavailableTitle:"การค้นหาไม่พร้อมใช้งานชั่วคราว",unavailableBody:"ขณะนี้ไม่สามารถเข้าถึงข้อมูลโรงแรมได้ โปรดลองอีกครั้งในอีกสักครู่",sponsored:"ผู้สนับสนุน",showMore:"แสดงโรงแรมเพิ่มเติม",amenities:{WIFI:"Wi-Fi",PARKING:"ที่จอดรถ",POOL:"สระว่ายน้ำ",GYM:"ฟิตเนส",BREAKFAST:"อาหารเช้า"}},
};

export function searchUiCopy(locale:GuestLocale):SearchUiCopy{return COPY[locale];}
