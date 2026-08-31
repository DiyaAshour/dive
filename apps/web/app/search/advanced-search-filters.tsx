"use client";

import { useEffect } from "react";
import { localeFromLanguageTag, type GuestLocale } from "@/lib/guest-market";

type Copy = Readonly<{
  guestRating:string; good:string; veryGood:string; excellent:string; moreFilters:string;
  propertyType:string; area:string; moreFacilities:string; hotel:string; apartment:string; villa:string; hostel:string; chalet:string; holidayHome:string;
  spa:string; restaurant:string; airportShuttle:string; beachAccess:string; familyRooms:string; businessCenter:string; airConditioning:string; roomService:string; bar:string; evCharging:string; wheelchairAccess:string;
}>;

const EN:Copy={guestRating:"Guest rating",good:"Good",veryGood:"Very good",excellent:"Excellent",moreFilters:"More filters",propertyType:"Property type",area:"Area / neighborhood",moreFacilities:"More facilities",hotel:"Hotel",apartment:"Apartment",villa:"Villa",hostel:"Hostel",chalet:"Chalet",holidayHome:"Holiday home",spa:"Spa",restaurant:"Restaurant",airportShuttle:"Airport shuttle",beachAccess:"Beach access",familyRooms:"Family rooms",businessCenter:"Business center",airConditioning:"Air conditioning",roomService:"Room service",bar:"Bar",evCharging:"EV charging",wheelchairAccess:"Wheelchair access"};
const COPY:Partial<Record<GuestLocale,Copy>>={
  ar:{guestRating:"تقييم الضيوف",good:"جيد",veryGood:"جيد جدًا",excellent:"ممتاز",moreFilters:"المزيد من الفلاتر",propertyType:"نوع مكان الإقامة",area:"المنطقة / الحي",moreFacilities:"مرافق إضافية",hotel:"فندق",apartment:"شقة",villa:"فيلا",hostel:"نُزل",chalet:"شاليه",holidayHome:"بيت عطلات",spa:"سبا",restaurant:"مطعم",airportShuttle:"نقل من وإلى المطار",beachAccess:"إمكانية الوصول للشاطئ",familyRooms:"غرف عائلية",businessCenter:"مركز أعمال",airConditioning:"تكييف",roomService:"خدمة الغرف",bar:"بار",evCharging:"شحن سيارات كهربائية",wheelchairAccess:"مناسب للكراسي المتحركة"},
  zh:{guestRating:"住客评分",good:"好",veryGood:"很好",excellent:"非常好",moreFilters:"更多筛选",propertyType:"住宿类型",area:"区域 / 街区",moreFacilities:"更多设施",hotel:"酒店",apartment:"公寓",villa:"别墅",hostel:"青旅",chalet:"木屋",holidayHome:"度假屋",spa:"水疗",restaurant:"餐厅",airportShuttle:"机场班车",beachAccess:"海滩",familyRooms:"家庭房",businessCenter:"商务中心",airConditioning:"空调",roomService:"客房服务",bar:"酒吧",evCharging:"电动车充电",wheelchairAccess:"无障碍通行"},
  fr:{guestRating:"Note des clients",good:"Bien",veryGood:"Très bien",excellent:"Excellent",moreFilters:"Plus de filtres",propertyType:"Type d’hébergement",area:"Quartier",moreFacilities:"Plus d’équipements",hotel:"Hôtel",apartment:"Appartement",villa:"Villa",hostel:"Auberge",chalet:"Chalet",holidayHome:"Maison de vacances",spa:"Spa",restaurant:"Restaurant",airportShuttle:"Navette aéroport",beachAccess:"Accès plage",familyRooms:"Chambres familiales",businessCenter:"Centre d’affaires",airConditioning:"Climatisation",roomService:"Service en chambre",bar:"Bar",evCharging:"Recharge VE",wheelchairAccess:"Accès fauteuil roulant"},
  de:{guestRating:"Gästebewertung",good:"Gut",veryGood:"Sehr gut",excellent:"Hervorragend",moreFilters:"Mehr Filter",propertyType:"Unterkunftsart",area:"Gegend / Viertel",moreFacilities:"Weitere Ausstattung",hotel:"Hotel",apartment:"Apartment",villa:"Villa",hostel:"Hostel",chalet:"Chalet",holidayHome:"Ferienhaus",spa:"Spa",restaurant:"Restaurant",airportShuttle:"Flughafenshuttle",beachAccess:"Strandzugang",familyRooms:"Familienzimmer",businessCenter:"Businesscenter",airConditioning:"Klimaanlage",roomService:"Zimmerservice",bar:"Bar",evCharging:"E-Ladestation",wheelchairAccess:"Rollstuhlgerecht"},
  es:{guestRating:"Puntuación de huéspedes",good:"Bien",veryGood:"Muy bien",excellent:"Excelente",moreFilters:"Más filtros",propertyType:"Tipo de alojamiento",area:"Zona / barrio",moreFacilities:"Más instalaciones",hotel:"Hotel",apartment:"Apartamento",villa:"Villa",hostel:"Hostal",chalet:"Chalet",holidayHome:"Casa vacacional",spa:"Spa",restaurant:"Restaurante",airportShuttle:"Traslado al aeropuerto",beachAccess:"Acceso a la playa",familyRooms:"Habitaciones familiares",businessCenter:"Centro de negocios",airConditioning:"Aire acondicionado",roomService:"Servicio de habitaciones",bar:"Bar",evCharging:"Carga de VE",wheelchairAccess:"Acceso para silla de ruedas"},
  it:{guestRating:"Valutazione ospiti",good:"Buono",veryGood:"Molto buono",excellent:"Eccellente",moreFilters:"Altri filtri",propertyType:"Tipo di struttura",area:"Zona / quartiere",moreFacilities:"Altri servizi",hotel:"Hotel",apartment:"Appartamento",villa:"Villa",hostel:"Ostello",chalet:"Chalet",holidayHome:"Casa vacanze",spa:"Spa",restaurant:"Ristorante",airportShuttle:"Navetta aeroporto",beachAccess:"Accesso spiaggia",familyRooms:"Camere familiari",businessCenter:"Centro business",airConditioning:"Aria condizionata",roomService:"Servizio in camera",bar:"Bar",evCharging:"Ricarica EV",wheelchairAccess:"Accesso disabili"},
  tr:{guestRating:"Misafir puanı",good:"İyi",veryGood:"Çok iyi",excellent:"Mükemmel",moreFilters:"Daha fazla filtre",propertyType:"Tesis türü",area:"Bölge / semt",moreFacilities:"Daha fazla olanak",hotel:"Otel",apartment:"Daire",villa:"Villa",hostel:"Hostel",chalet:"Dağ evi",holidayHome:"Tatil evi",spa:"Spa",restaurant:"Restoran",airportShuttle:"Havaalanı servisi",beachAccess:"Plaj erişimi",familyRooms:"Aile odaları",businessCenter:"İş merkezi",airConditioning:"Klima",roomService:"Oda servisi",bar:"Bar",evCharging:"EV şarj",wheelchairAccess:"Tekerlekli sandalye erişimi"},
  ru:{guestRating:"Оценка гостей",good:"Хорошо",veryGood:"Очень хорошо",excellent:"Превосходно",moreFilters:"Больше фильтров",propertyType:"Тип жилья",area:"Район",moreFacilities:"Другие удобства",hotel:"Отель",apartment:"Апартаменты",villa:"Вилла",hostel:"Хостел",chalet:"Шале",holidayHome:"Дом для отпуска",spa:"Спа",restaurant:"Ресторан",airportShuttle:"Трансфер из аэропорта",beachAccess:"Доступ к пляжу",familyRooms:"Семейные номера",businessCenter:"Бизнес-центр",airConditioning:"Кондиционер",roomService:"Обслуживание номеров",bar:"Бар",evCharging:"Зарядка электромобилей",wheelchairAccess:"Доступ для колясок"},
  ja:{guestRating:"ゲスト評価",good:"良い",veryGood:"とても良い",excellent:"最高",moreFilters:"その他の絞り込み",propertyType:"宿泊施設タイプ",area:"エリア / 地区",moreFacilities:"その他の設備",hotel:"ホテル",apartment:"アパートメント",villa:"ヴィラ",hostel:"ホステル",chalet:"シャレー",holidayHome:"別荘",spa:"スパ",restaurant:"レストラン",airportShuttle:"空港シャトル",beachAccess:"ビーチアクセス",familyRooms:"ファミリールーム",businessCenter:"ビジネスセンター",airConditioning:"エアコン",roomService:"ルームサービス",bar:"バー",evCharging:"EV充電",wheelchairAccess:"車椅子対応"},
  ko:{guestRating:"투숙객 평점",good:"좋음",veryGood:"매우 좋음",excellent:"최고",moreFilters:"필터 더보기",propertyType:"숙소 유형",area:"지역 / 동네",moreFacilities:"추가 시설",hotel:"호텔",apartment:"아파트",villa:"빌라",hostel:"호스텔",chalet:"샬레",holidayHome:"홀리데이 홈",spa:"스파",restaurant:"레스토랑",airportShuttle:"공항 셔틀",beachAccess:"해변 이용",familyRooms:"가족 객실",businessCenter:"비즈니스 센터",airConditioning:"에어컨",roomService:"룸서비스",bar:"바",evCharging:"EV 충전",wheelchairAccess:"휠체어 이용 가능"},
  hi:{guestRating:"मेहमान रेटिंग",good:"अच्छा",veryGood:"बहुत अच्छा",excellent:"उत्कृष्ट",moreFilters:"और फ़िल्टर",propertyType:"प्रॉपर्टी प्रकार",area:"इलाका / पड़ोस",moreFacilities:"और सुविधाएँ",hotel:"होटल",apartment:"अपार्टमेंट",villa:"विला",hostel:"हॉस्टल",chalet:"शैले",holidayHome:"हॉलिडे होम",spa:"स्पा",restaurant:"रेस्तरां",airportShuttle:"एयरपोर्ट शटल",beachAccess:"बीच एक्सेस",familyRooms:"फैमिली रूम",businessCenter:"बिज़नेस सेंटर",airConditioning:"एयर कंडीशनिंग",roomService:"रूम सर्विस",bar:"बार",evCharging:"EV चार्जिंग",wheelchairAccess:"व्हीलचेयर एक्सेस"},
  pt:{guestRating:"Nota dos hóspedes",good:"Bom",veryGood:"Muito bom",excellent:"Excelente",moreFilters:"Mais filtros",propertyType:"Tipo de acomodação",area:"Área / bairro",moreFacilities:"Mais comodidades",hotel:"Hotel",apartment:"Apartamento",villa:"Villa",hostel:"Hostel",chalet:"Chalé",holidayHome:"Casa de férias",spa:"Spa",restaurant:"Restaurante",airportShuttle:"Transfer aeroporto",beachAccess:"Acesso à praia",familyRooms:"Quartos familiares",businessCenter:"Centro de negócios",airConditioning:"Ar-condicionado",roomService:"Serviço de quarto",bar:"Bar",evCharging:"Recarga de VE",wheelchairAccess:"Acesso para cadeira de rodas"},
  id:{guestRating:"Rating tamu",good:"Baik",veryGood:"Sangat baik",excellent:"Istimewa",moreFilters:"Filter lainnya",propertyType:"Jenis properti",area:"Area / lingkungan",moreFacilities:"Fasilitas lainnya",hotel:"Hotel",apartment:"Apartemen",villa:"Vila",hostel:"Hostel",chalet:"Chalet",holidayHome:"Rumah liburan",spa:"Spa",restaurant:"Restoran",airportShuttle:"Antar-jemput bandara",beachAccess:"Akses pantai",familyRooms:"Kamar keluarga",businessCenter:"Pusat bisnis",airConditioning:"AC",roomService:"Layanan kamar",bar:"Bar",evCharging:"Pengisian EV",wheelchairAccess:"Akses kursi roda"},
  th:{guestRating:"คะแนนผู้เข้าพัก",good:"ดี",veryGood:"ดีมาก",excellent:"ยอดเยี่ยม",moreFilters:"ตัวกรองเพิ่มเติม",propertyType:"ประเภทที่พัก",area:"พื้นที่ / ย่าน",moreFacilities:"สิ่งอำนวยความสะดวกเพิ่มเติม",hotel:"โรงแรม",apartment:"อพาร์ตเมนต์",villa:"วิลลา",hostel:"โฮสเทล",chalet:"ชาเลต์",holidayHome:"บ้านพักตากอากาศ",spa:"สปา",restaurant:"ร้านอาหาร",airportShuttle:"รถรับส่งสนามบิน",beachAccess:"ทางเข้าชายหาด",familyRooms:"ห้องสำหรับครอบครัว",businessCenter:"ศูนย์ธุรกิจ",airConditioning:"เครื่องปรับอากาศ",roomService:"รูมเซอร์วิส",bar:"บาร์",evCharging:"ที่ชาร์จ EV",wheelchairAccess:"รองรับรถเข็น"}
};

const PROPERTY_TYPES=[
  ["HOTEL","hotel"],["APARTMENT","apartment"],["VILLA","villa"],["HOSTEL","hostel"],["CHALET","chalet"],["HOLIDAY_HOME","holidayHome"],
] as const;
const EXTRA_AMENITIES=[
  ["SPA","spa"],["RESTAURANT","restaurant"],["AIRPORT_SHUTTLE","airportShuttle"],["BEACH_ACCESS","beachAccess"],["FAMILY_ROOMS","familyRooms"],["BUSINESS_CENTER","businessCenter"],["AIR_CONDITIONING","airConditioning"],["ROOM_SERVICE","roomService"],["BAR","bar"],["EV_CHARGING","evCharging"],["WHEELCHAIR_ACCESS","wheelchairAccess"],
] as const;

export function AdvancedSearchFilters(){
  useEffect(()=>{
    const locale=localeFromLanguageTag(document.querySelector<HTMLElement>(".searchExperience")?.lang||document.documentElement.lang)||"en";
    const copy=COPY[locale]??EN;
    const selected=new Set(new URLSearchParams(window.location.search).getAll("amenities").map((value)=>value.toUpperCase()));

    const discoverAreas=()=>{
      const found=new Map<string,string>();
      document.querySelectorAll<HTMLElement>(".premiumResultCard .stayCardMeta").forEach((meta)=>{
        const full=(meta.textContent||"").trim();
        const place=(full.includes("·")?full.split("·").pop()||"":full).trim();
        const comma=place.lastIndexOf(",");
        if(comma<=0)return;
        const area=place.slice(0,comma).trim();
        if(area)found.set(area.toUpperCase(),area);
      });
      for(const value of selected){if(value.startsWith("FILTER:AREA:")){const area=value.slice("FILTER:AREA:".length).trim();if(area&&!found.has(area))found.set(area,area);}}
      return [...found.values()].slice(0,10);
    };

    const ratingToken=()=>[...selected].find((value)=>value.startsWith("FILTER:RATING:"))||"";

    const enhance=(form:HTMLFormElement,mobile:boolean)=>{
      if(form.dataset.advancedFilters==="true")return;
      form.dataset.advancedFilters="true";
      const anchor=mobile?form.querySelector(".mobileSearchSheetActions"):form.querySelector(".filterApply");
      if(!anchor)return;

      const rating=document.createElement("div");
      rating.className=mobile?"advancedFilterSection advancedFilterRating mobileFilterSection":"advancedFilterSection advancedFilterRating filterBlock";
      const heading=document.createElement("strong");heading.textContent=copy.guestRating;rating.appendChild(heading);
      const ratingRow=document.createElement("div");ratingRow.className="advancedRatingRow";
      const hidden=document.createElement("input");hidden.type="hidden";hidden.name="amenities";hidden.value=ratingToken();rating.appendChild(hidden);
      ([[7,copy.good],[8,copy.veryGood],[9,copy.excellent]] as const).forEach(([score,label])=>{
        const token=`FILTER:RATING:${score}`;
        const button=document.createElement("button");button.type="button";button.className=`advancedRatingChoice${selected.has(token)?" isActive":""}`;
        button.innerHTML=`<b>${score}+</b><span>${label}</span>`;
        button.addEventListener("click",()=>{
          const wasActive=button.classList.contains("isActive");
          ratingRow.querySelectorAll(".advancedRatingChoice").forEach((item)=>item.classList.remove("isActive"));
          hidden.value=wasActive?"":token;
          if(!wasActive)button.classList.add("isActive");
        });
        ratingRow.appendChild(button);
      });
      rating.appendChild(ratingRow);

      const details=document.createElement("details");details.className="advancedFiltersDetails";
      const summary=document.createElement("summary");summary.textContent=copy.moreFilters;details.appendChild(summary);
      const body=document.createElement("div");body.className="advancedFiltersBody";
      body.appendChild(checkSection(copy.propertyType,PROPERTY_TYPES.map(([value,key])=>({value:`FILTER:PROPERTY:${value}`,label:copy[key]})),selected));
      const areas=discoverAreas();
      if(areas.length)body.appendChild(checkSection(copy.area,areas.map((area)=>({value:`FILTER:AREA:${area.toUpperCase()}`,label:area})),selected));
      body.appendChild(checkSection(copy.moreFacilities,EXTRA_AMENITIES.map(([value,key])=>({value,label:copy[key]})),selected,true));
      details.appendChild(body);

      anchor.before(rating,details);
    };

    const enhanceAll=()=>{
      document.querySelectorAll<HTMLFormElement>("form.filterForm").forEach((form)=>enhance(form,false));
      document.querySelectorAll<HTMLFormElement>("form.mobileSearchFilterForm").forEach((form)=>enhance(form,true));
    };
    enhanceAll();
    const observer=new MutationObserver(enhanceAll);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  return <style>{`
    .advancedFilterSection{display:grid;gap:9px}.advancedFilterSection>strong,.advancedCheckSection>strong{font-size:12px;color:#435a70}
    .advancedRatingRow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .advancedRatingChoice{min-height:48px;border:1px solid #d5dfe7;border-radius:12px;background:#fff;color:#405a70;display:grid;place-items:center;gap:1px;padding:6px;cursor:pointer;transition:.15s ease}
    .advancedRatingChoice b{font-size:15px;color:#173a59}.advancedRatingChoice span{font-size:9px;font-weight:750}.advancedRatingChoice:hover{border-color:#abc0d1;background:#f7fafc}.advancedRatingChoice.isActive{border-color:#1872c9;background:#edf6ff;box-shadow:0 0 0 2px rgba(24,114,201,.08)}
    .advancedFiltersDetails{border-top:1px solid #e5ebf0;padding-top:11px}.advancedFiltersDetails>summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;min-height:40px;color:#174d78;font-size:12px;font-weight:900}.advancedFiltersDetails>summary::-webkit-details-marker{display:none}.advancedFiltersDetails>summary:after{content:"+";font-size:18px;font-weight:600}.advancedFiltersDetails[open]>summary:after{content:"−"}
    .advancedFiltersBody{display:grid;gap:17px;padding:8px 0 3px}.advancedCheckSection{display:grid;gap:8px}.advancedCheckGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .advancedCheck{position:relative;display:flex!important;align-items:center!important;gap:8px!important;min-height:38px;padding:7px 8px!important;border:1px solid #e0e7ed;border-radius:10px;background:#fff;font-size:10px!important;color:#405469!important}.advancedCheck input{accent-color:#176cbc}.advancedCheck span{min-width:0;line-height:1.25}
    .mobileSearchSheet .advancedFilterRating{padding-top:16px}.mobileSearchSheet .advancedFiltersDetails{margin:0 20px;padding-top:14px}.mobileSearchSheet .advancedFiltersBody{padding-bottom:12px}.mobileSearchSheet .advancedCheck{min-height:44px;font-size:12px!important}.mobileSearchSheet .advancedFilterSection>strong,.mobileSearchSheet .advancedCheckSection>strong{font-size:13px}
    @media(max-width:390px){.advancedCheckGrid{grid-template-columns:1fr}.advancedRatingChoice{min-height:46px}}
  `}</style>;
}

function checkSection(title:string,items:ReadonlyArray<{value:string;label:string}>,selected:Set<string>,amenity=false){
  const section=document.createElement("div");section.className="advancedCheckSection";
  const heading=document.createElement("strong");heading.textContent=title;section.appendChild(heading);
  const grid=document.createElement("div");grid.className="advancedCheckGrid";
  for(const item of items){
    const label=document.createElement("label");label.className="advancedCheck";
    const input=document.createElement("input");input.type="checkbox";input.name="amenities";input.value=item.value;input.defaultChecked=selected.has(item.value.toUpperCase());
    const text=document.createElement("span");text.textContent=item.label;
    label.append(input,text);grid.appendChild(label);
  }
  if(amenity)grid.dataset.kind="amenities";
  section.appendChild(grid);return section;
}
