import type {GuestLocale} from "./guest-market";

type HeaderCopy={rewards:string;guide:string;menu:string};
type MobileNavCopy={home:string;search:string;trips:string;rewards:string;account:string};
type MarketCopy={title:string;subtitle:string;language:string;currency:string;detected:string;cancel:string;apply:string;saving:string;error:string};
type DestinationCopy={eyebrow:string;title:string;intro:string;stays:string;explore:string;seeRooms:string;clearPrice:string};

type GuestUiCopy={header:HeaderCopy;mobileNav:MobileNavCopy;market:MarketCopy;destination:DestinationCopy};

const COPY:Record<GuestLocale,GuestUiCopy>={
  en:{
    header:{rewards:"Rewards",guide:"Travel guide",menu:"Menu"},
    mobileNav:{home:"Home",search:"Search",trips:"Trips",rewards:"Rewards",account:"Account"},
    market:{title:"Language & currency",subtitle:"Choose how HandMeKey is shown to you",language:"Language",currency:"Currency",detected:"Detected market",cancel:"Cancel",apply:"Apply",saving:"Saving…",error:"Could not save your preferences. Try again."},
    destination:{eyebrow:"Explore Jordan",title:"Popular destinations",intro:"Explore Jordan destinations with bilingual aliases and live verified hotel inventory.",stays:"stays available",explore:"Explore stays",seeRooms:"See rooms & prices",clearPrice:"Clear price before booking"},
  },
  ar:{
    header:{rewards:"المكافآت",guide:"دليل السفر",menu:"القائمة"},
    mobileNav:{home:"الرئيسية",search:"البحث",trips:"رحلاتي",rewards:"المكافآت",account:"حسابي"},
    market:{title:"اللغة والعملة",subtitle:"خصّص طريقة عرض HandMeKey",language:"اللغة",currency:"العملة",detected:"السوق المكتشف",cancel:"إلغاء",apply:"تطبيق",saving:"جارٍ الحفظ…",error:"تعذر حفظ الإعدادات. حاول مرة أخرى."},
    destination:{eyebrow:"اكتشف الأردن",title:"الوجهات الرائجة",intro:"استكشف المدن والوجهات الأكثر حضورًا في الأردن مع توفر الفنادق الموثقة مباشرة.",stays:"إقامة متاحة",explore:"استكشف الإقامات",seeRooms:"شاهد الغرف والأسعار",clearPrice:"السعر الواضح قبل الحجز"},
  },
  zh:{
    header:{rewards:"奖励",guide:"旅行指南",menu:"菜单"},
    mobileNav:{home:"首页",search:"搜索",trips:"行程",rewards:"奖励",account:"账户"},
    market:{title:"语言和货币",subtitle:"自定义 HandMeKey 的显示方式",language:"语言",currency:"货币",detected:"检测到的市场",cancel:"取消",apply:"应用",saving:"正在保存…",error:"无法保存设置，请重试。"},
    destination:{eyebrow:"探索约旦",title:"热门目的地",intro:"探索约旦热门城市和目的地，并查看实时已验证酒店房量。",stays:"家住宿可订",explore:"查看住宿",seeRooms:"查看客房和价格",clearPrice:"预订前查看清晰价格"},
  },
  fr:{
    header:{rewards:"Récompenses",guide:"Guide de voyage",menu:"Menu"},
    mobileNav:{home:"Accueil",search:"Recherche",trips:"Voyages",rewards:"Récompenses",account:"Compte"},
    market:{title:"Langue et devise",subtitle:"Choisissez comment HandMeKey s’affiche",language:"Langue",currency:"Devise",detected:"Marché détecté",cancel:"Annuler",apply:"Appliquer",saving:"Enregistrement…",error:"Impossible d’enregistrer vos préférences. Réessayez."},
    destination:{eyebrow:"Découvrir la Jordanie",title:"Destinations populaires",intro:"Explorez les principales destinations de Jordanie et leurs hébergements vérifiés disponibles en direct.",stays:"hébergements disponibles",explore:"Voir les hébergements",seeRooms:"Voir les chambres et tarifs",clearPrice:"Prix clair avant réservation"},
  },
  de:{
    header:{rewards:"Prämien",guide:"Reiseführer",menu:"Menü"},
    mobileNav:{home:"Start",search:"Suche",trips:"Reisen",rewards:"Prämien",account:"Konto"},
    market:{title:"Sprache & Währung",subtitle:"Wählen Sie, wie HandMeKey angezeigt wird",language:"Sprache",currency:"Währung",detected:"Erkannter Markt",cancel:"Abbrechen",apply:"Übernehmen",saving:"Speichern…",error:"Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen."},
    destination:{eyebrow:"Jordanien entdecken",title:"Beliebte Reiseziele",intro:"Entdecken Sie beliebte Ziele in Jordanien mit live verfügbarem, geprüftem Hotelbestand.",stays:"Unterkünfte verfügbar",explore:"Unterkünfte ansehen",seeRooms:"Zimmer & Preise ansehen",clearPrice:"Klarer Preis vor der Buchung"},
  },
  es:{
    header:{rewards:"Recompensas",guide:"Guía de viaje",menu:"Menú"},
    mobileNav:{home:"Inicio",search:"Buscar",trips:"Viajes",rewards:"Recompensas",account:"Cuenta"},
    market:{title:"Idioma y moneda",subtitle:"Elige cómo se muestra HandMeKey",language:"Idioma",currency:"Moneda",detected:"Mercado detectado",cancel:"Cancelar",apply:"Aplicar",saving:"Guardando…",error:"No pudimos guardar tus preferencias. Inténtalo de nuevo."},
    destination:{eyebrow:"Descubre Jordania",title:"Destinos populares",intro:"Explora los destinos principales de Jordania con inventario hotelero verificado en directo.",stays:"alojamientos disponibles",explore:"Explorar alojamientos",seeRooms:"Ver habitaciones y precios",clearPrice:"Precio claro antes de reservar"},
  },
  it:{
    header:{rewards:"Premi",guide:"Guida di viaggio",menu:"Menu"},
    mobileNav:{home:"Home",search:"Cerca",trips:"Viaggi",rewards:"Premi",account:"Account"},
    market:{title:"Lingua e valuta",subtitle:"Scegli come visualizzare HandMeKey",language:"Lingua",currency:"Valuta",detected:"Mercato rilevato",cancel:"Annulla",apply:"Applica",saving:"Salvataggio…",error:"Impossibile salvare le preferenze. Riprova."},
    destination:{eyebrow:"Scopri la Giordania",title:"Destinazioni popolari",intro:"Esplora le principali destinazioni della Giordania con disponibilità hotel verificata in tempo reale.",stays:"soggiorni disponibili",explore:"Esplora soggiorni",seeRooms:"Vedi camere e prezzi",clearPrice:"Prezzo chiaro prima della prenotazione"},
  },
  tr:{
    header:{rewards:"Ödüller",guide:"Seyahat rehberi",menu:"Menü"},
    mobileNav:{home:"Ana sayfa",search:"Ara",trips:"Seyahatler",rewards:"Ödüller",account:"Hesap"},
    market:{title:"Dil ve para birimi",subtitle:"HandMeKey’in size nasıl gösterileceğini seçin",language:"Dil",currency:"Para birimi",detected:"Algılanan pazar",cancel:"İptal",apply:"Uygula",saving:"Kaydediliyor…",error:"Tercihler kaydedilemedi. Tekrar deneyin."},
    destination:{eyebrow:"Ürdün’ü keşfet",title:"Popüler destinasyonlar",intro:"Ürdün’ün öne çıkan destinasyonlarını canlı doğrulanmış otel müsaitliğiyle keşfedin.",stays:"konaklama müsait",explore:"Konaklamaları keşfet",seeRooms:"Odaları ve fiyatları gör",clearPrice:"Rezervasyondan önce net fiyat"},
  },
  ru:{
    header:{rewards:"Награды",guide:"Путеводитель",menu:"Меню"},
    mobileNav:{home:"Главная",search:"Поиск",trips:"Поездки",rewards:"Награды",account:"Аккаунт"},
    market:{title:"Язык и валюта",subtitle:"Выберите, как отображать HandMeKey",language:"Язык",currency:"Валюта",detected:"Определённый рынок",cancel:"Отмена",apply:"Применить",saving:"Сохранение…",error:"Не удалось сохранить настройки. Попробуйте ещё раз."},
    destination:{eyebrow:"Откройте Иорданию",title:"Популярные направления",intro:"Исследуйте главные направления Иордании с актуальной доступностью проверенных отелей.",stays:"вариантов доступно",explore:"Смотреть варианты",seeRooms:"Смотреть номера и цены",clearPrice:"Понятная цена до бронирования"},
  },
  ja:{
    header:{rewards:"特典",guide:"旅行ガイド",menu:"メニュー"},
    mobileNav:{home:"ホーム",search:"検索",trips:"旅行",rewards:"特典",account:"アカウント"},
    market:{title:"言語と通貨",subtitle:"HandMeKey の表示方法を選択",language:"言語",currency:"通貨",detected:"検出された市場",cancel:"キャンセル",apply:"適用",saving:"保存中…",error:"設定を保存できませんでした。もう一度お試しください。"},
    destination:{eyebrow:"ヨルダンを探索",title:"人気の目的地",intro:"ヨルダンの主要な目的地を、確認済みホテルのリアルタイム空室とともに探索できます。",stays:"件の宿泊施設が利用可能",explore:"宿泊施設を見る",seeRooms:"客室と料金を見る",clearPrice:"予約前に明確な料金"},
  },
  ko:{
    header:{rewards:"리워드",guide:"여행 가이드",menu:"메뉴"},
    mobileNav:{home:"홈",search:"검색",trips:"여행",rewards:"리워드",account:"계정"},
    market:{title:"언어 및 통화",subtitle:"HandMeKey 표시 방식을 선택하세요",language:"언어",currency:"통화",detected:"감지된 시장",cancel:"취소",apply:"적용",saving:"저장 중…",error:"설정을 저장하지 못했습니다. 다시 시도하세요."},
    destination:{eyebrow:"요르단 둘러보기",title:"인기 여행지",intro:"검증된 호텔의 실시간 객실 현황과 함께 요르단의 주요 여행지를 둘러보세요.",stays:"개 숙소 예약 가능",explore:"숙소 보기",seeRooms:"객실 및 가격 보기",clearPrice:"예약 전 명확한 가격"},
  },
  hi:{
    header:{rewards:"रिवॉर्ड्स",guide:"यात्रा गाइड",menu:"मेन्यू"},
    mobileNav:{home:"होम",search:"खोज",trips:"यात्राएँ",rewards:"रिवॉर्ड्स",account:"खाता"},
    market:{title:"भाषा और मुद्रा",subtitle:"चुनें कि HandMeKey आपको कैसे दिखे",language:"भाषा",currency:"मुद्रा",detected:"पहचाना गया बाज़ार",cancel:"रद्द करें",apply:"लागू करें",saving:"सहेजा जा रहा है…",error:"आपकी प्राथमिकताएँ सहेजी नहीं जा सकीं। फिर कोशिश करें।"},
    destination:{eyebrow:"जॉर्डन खोजें",title:"लोकप्रिय गंतव्य",intro:"जॉर्डन के प्रमुख गंतव्य सत्यापित होटल की लाइव उपलब्धता के साथ देखें।",stays:"ठहराव उपलब्ध",explore:"ठहराव देखें",seeRooms:"कमरे और कीमतें देखें",clearPrice:"बुकिंग से पहले स्पष्ट कीमत"},
  },
  pt:{
    header:{rewards:"Recompensas",guide:"Guia de viagem",menu:"Menu"},
    mobileNav:{home:"Início",search:"Buscar",trips:"Viagens",rewards:"Recompensas",account:"Conta"},
    market:{title:"Idioma e moeda",subtitle:"Escolha como o HandMeKey aparece para você",language:"Idioma",currency:"Moeda",detected:"Mercado detectado",cancel:"Cancelar",apply:"Aplicar",saving:"Salvando…",error:"Não foi possível salvar suas preferências. Tente novamente."},
    destination:{eyebrow:"Descubra a Jordânia",title:"Destinos populares",intro:"Explore os principais destinos da Jordânia com disponibilidade ao vivo de hotéis verificados.",stays:"hospedagens disponíveis",explore:"Explorar hospedagens",seeRooms:"Ver quartos e preços",clearPrice:"Preço claro antes de reservar"},
  },
  id:{
    header:{rewards:"Hadiah",guide:"Panduan perjalanan",menu:"Menu"},
    mobileNav:{home:"Beranda",search:"Cari",trips:"Perjalanan",rewards:"Hadiah",account:"Akun"},
    market:{title:"Bahasa & mata uang",subtitle:"Pilih bagaimana HandMeKey ditampilkan",language:"Bahasa",currency:"Mata uang",detected:"Pasar terdeteksi",cancel:"Batal",apply:"Terapkan",saving:"Menyimpan…",error:"Preferensi tidak dapat disimpan. Coba lagi."},
    destination:{eyebrow:"Jelajahi Yordania",title:"Destinasi populer",intro:"Jelajahi destinasi utama Yordania dengan ketersediaan hotel terverifikasi secara live.",stays:"penginapan tersedia",explore:"Jelajahi penginapan",seeRooms:"Lihat kamar & harga",clearPrice:"Harga jelas sebelum memesan"},
  },
  th:{
    header:{rewards:"รางวัล",guide:"คู่มือท่องเที่ยว",menu:"เมนู"},
    mobileNav:{home:"หน้าแรก",search:"ค้นหา",trips:"ทริป",rewards:"รางวัล",account:"บัญชี"},
    market:{title:"ภาษาและสกุลเงิน",subtitle:"เลือกวิธีแสดง HandMeKey",language:"ภาษา",currency:"สกุลเงิน",detected:"ตลาดที่ตรวจพบ",cancel:"ยกเลิก",apply:"ใช้",saving:"กำลังบันทึก…",error:"ไม่สามารถบันทึกการตั้งค่าได้ โปรดลองอีกครั้ง"},
    destination:{eyebrow:"สำรวจจอร์แดน",title:"จุดหมายยอดนิยม",intro:"สำรวจจุดหมายสำคัญในจอร์แดนพร้อมห้องว่างแบบสดจากโรงแรมที่ผ่านการตรวจสอบ",stays:"ที่พักพร้อมจอง",explore:"ดูที่พัก",seeRooms:"ดูห้องและราคา",clearPrice:"เห็นราคาชัดเจนก่อนจอง"},
  },
};

export function guestUiCopy(locale:GuestLocale):GuestUiCopy{return COPY[locale];}
