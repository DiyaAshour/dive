export type Locale = "en" | "ar";

export const localeCookieName = "hmk_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

const en = {
  language: {english: "English", arabic: "العربية", label: "Language"},
  nav: {stays: "Stays", trips: "My trips", alerts: "Price alerts", partner: "List your property", account: "Account", signIn: "Sign in", signOut: "Sign out", signingOut: "Signing out…"},
  home: {
    kicker: "Hotels, clearly priced",
    title: "Find the stay you want. See the price you’ll actually pay.",
    intro: "Live hotel inventory, verified properties, real guest reviews and cancellation terms shown before you commit.",
    verified: "Verified properties", cancellation: "Stored cancellation terms", total: "Final stay total",
    livePlaceholder: "Live stays will appear here", livePlaceholderSub: "Only active, verified properties with published media are shown.",
    where: "Where", whereHint: "City, area or hotel", checkIn: "Check in", checkOut: "Check out", guests: "Guests", adults: "Adults", search: "Search stays",
    liveEyebrow: "Live on HandMeKey", liveTitle: "Verified stays worth opening.", liveIntro: "Properties appear here only after platform review and with live hotel content.", explore: "Explore all stays",
    noHotels: "No verified properties are published yet", noHotelsSub: "Draft and unverified hotels stay private until they complete the publishing review.",
    photoPending: "Photo pending", verifiedLabel: "Verified", demoProperty: "Demo property", review: "verified review", reviews: "verified reviews", checkPrice: "Check live price",
    valueEyebrow: "Designed around the booking", valueTitle: "Less guessing between search and confirmation.",
    finalTitle: "Final totals first", finalBody: "Service and mandatory charges stay inside the server-calculated total shown before booking.",
    policyTitle: "Policies that travel with the booking", policyBody: "The cancellation policy is snapshotted when you book so later edits cannot rewrite your original terms.",
    watchTitle: "Watch a real stay price", watchBody: "Track the same hotel and dates. HandMeKey re-prices through live rates, inventory and active promotions.",
    partnerEyebrow: "For hotel partners", partnerTitle: "Own the listing. Control the rate. See the conversion.", partnerBody: "Partner Hub combines property setup, reservations, promotions, guest messages and first-party performance intelligence.", partnerCta: "Explore Partner Hub"
  },
  search: {
    destination: "Destination", checkIn: "Check in", checkOut: "Check out", adults: "Adults", children: "Children", again: "Search again",
    filter: "Filter your stay", nightly: "Nightly total", min: "Min", max: "Max", stars: "Star rating", anyStars: "Any stars", payment: "Payment", anyPayment: "Any payment mode", payHotel: "Pay at hotel", payNow: "Pay now", sort: "Sort by", recommended: "Recommended", lowPrice: "Lowest price", highPrice: "Highest price", highStars: "Highest stars", freeCancel: "Free cancellation now", facilities: "Facilities", apply: "Apply filters",
    live: "Live availability", verifiedProperty: "verified property", verifiedProperties: "verified properties", for: "for", save: "Save search",
    badTitle: "Search details need attention", invalid: "Invalid search", noneTitle: "No live offers match this stay", noneBody: "Try different dates, guest counts or fewer filters. Incomplete rates and unavailable inventory are intentionally excluded.",
    photoPending: "Photo pending", verified: "Verified", demoProperty: "demo property", demoProperties: "demo properties", review: "verified review", reviews: "verified reviews", off: "off", freeNow: "Free cancellation right now", penalty: "Cancellation penalty may apply", only: "Only", roomLeft: "room left for these dates", roomsLeft: "rooms left for these dates", finalTotal: "Final stay total", average: "average / night", seeRooms: "See rooms"
  },
  hotel: {
    back: "Back to {city} stays", verified: "Verified property", demoProperty: "Demo property", star: "star", guestSignal: "Excellent guest signal", stayReview: "verified stay review", stayReviews: "verified stay reviews", checkIn: "Check-in", checkOut: "Check-out", propertyPolicy: "Property policy",
    noPhotos: "Property photos are not published yet.", finalPrice: "Final price before booking", liveInventory: "Live room inventory", verifiedReviews: "Verified-stay reviews only",
    property: "The property", about: "About {hotel}", noDescription: "The property has not published a description yet.", facilities: "Facilities", noFacilities: "Facilities have not been published yet.",
    yourStay: "Your stay", chooseDates: "Choose dates and see the live total.", adults: "Adults", children: "Children", availability: "Check availability", invalidStay: "The requested stay was invalid, so HandMeKey loaded the next default dates.",
    available: "Available for your dates", liveRate: "live rate plan", liveRates: "live rate plans", night: "night", nights: "nights", totalsNote: "final totals include configured service and mandatory charges.", from: "From", stayTotal: "stay total",
    noRooms: "No rooms are sellable for this stay", noRoomsBody: "A rate only appears when every night has valid pricing, restrictions and remaining inventory.", room: "Room", upTo: "Up to", adult: "adult", adultsPlural: "adults", package: "Package", cancellation: "Cancellation", freeNow: "Free cancellation right now", currentPenalty: "Current penalty", finalTotal: "Final stay total", average: "average / night", base: "Base", service: "service", tax: "tax", choose: "Choose this room", only: "Only", left: "left",
    breakfast: "Breakfast included", halfBoard: "Half board", fullBoard: "Full board", roomOnly: "Room only", payHotel: "Pay at hotel", payNow: "Pay now",
    verifiedStays: "Verified stays", reviewsTitle: "What guests actually rated.", noReviews: "No verified reviews yet", noReviewsBody: "Only guests with completed bookings can publish a review.", outOf10: "out of 10", verifiedStaysCount: "verified stays", cleanliness: "Cleanliness", staff: "Staff", location: "Location", comfort: "Comfort", value: "Value", verifiedStay: "Verified stay", propertyResponse: "Property response"
  },
  checkout: {
    secure: "Secure booking", title: "Review the live rate before you confirm.", intro: "The total, payment mode and cancellation policy come from the same booking engine that creates your reservation.", session: "Secure account session", terms: "Stored booking terms", selectionTitle: "A live room selection is required", selectionBody: "Choose a hotel, room and rate plan before opening checkout. HandMeKey does not keep a hidden demo checkout fallback.", back: "Return to search",
    checking: "Checking live rate and availability…", loadFail: "We could not load this stay", guestInfo: "Guest information", fullName: "Full name", email: "Email", payment: "Payment option", payHotel: "Pay at hotel", payNow: "Pay now", gatewayMissing: "online gateway not configured", noPayment: "This rate currently requires online payment, but no payment provider is configured for this deployment.", reserve: "Reserve and continue", securing: "Securing your room…", holdNote: "Your room is reserved with a temporary server-side hold. The final rate is revalidated before inventory is reduced.", yourStay: "Your stay", roomBase: "Room base", service: "Employee service", tax: "Tax / mandatory charges", final: "Final total", cancellation: "Cancellation", noShow: "No-show", inventory: "Live sellable inventory", offIncluded: "off the room base is already included below.", paymentAction: "Payment was started but requires a provider action before the booking can be confirmed."
  },
  login: {
    eyebrow: "Your stay, in one place", title: "Book once. Keep every trip within reach.", intro: "Sign in to manage bookings, watch hotel prices and keep your conversation with the property attached to the stay.", verified: "Verified bookings", verifiedSub: "Access confirmed stays and cancellation terms.", alerts: "Price alerts", alertsSub: "Track a stay and get notified when the live rate drops.", messages: "Hotel messages", messagesSub: "Keep guest requests and property replies with the booking.", partner: "Managing a hotel?", partnerCta: "Go to Partner Hub"
  },
  account: {
    my: "My account", overview: "Overview", profile: "Personal details", security: "Security", trips: "My trips", alerts: "Price alerts", preferences: "Preferences",
    overviewEyebrow: "Traveler account", overviewTitle: "Everything around your stays, in one place.", overviewBody: "Bookings, price watches and security controls are tied to your signed-in account rather than the browser you happen to use.",
    upcoming: "Upcoming trips", activeWatches: "Active price watches", unreadAlerts: "Unread alerts", totalTrips: "Trips on account",
    profileCard: "Personal details", profileCardBody: "Keep the name used to prefill new bookings up to date.", securityCard: "Security", securityCardBody: "Change your password and close sessions you no longer trust.", tripsCard: "Trips", tripsCardBody: "Open confirmed, current, past and cancelled reservations.", alertsCard: "Price intelligence", alertsCardBody: "Manage saved searches, watches and durable in-app alerts.", open: "Open",
    prefTitle: "Language", prefBody: "Choose how HandMeKey customer pages are displayed. Your signed-in preference follows your account to other devices.", english: "English", arabic: "العربية"
  },
  profile: {eyebrow: "Account profile", title: "Personal details", body: "Keep the identity used to prefill future bookings accurate. Your sign-in email stays protected until verified email changes are available.", fullName: "Full name", email: "Sign-in email", protected: "Email is protected.", protectedBody: "HandMeKey will only allow email changes after a verified-email delivery flow is connected. We do not silently replace the identity used to access bookings.", smart: "Smarter checkout.", smartBody: "Your account name and sign-in email are prefilled when you book while signed in, but you can still change the guest name on an individual reservation.", saved: "Personal details saved.", save: "Save changes", saving: "Saving…"},
  security: {eyebrow: "Account protection", title: "Security", body: "Rotate your password and review active server sessions without exposing authentication tokens to the browser.", change: "Change password", changeBody: "A password change closes every existing session and issues a fresh session for this browser.", currentPassword: "Current password", newPassword: "New password", hint: "Use at least 12 characters.", update: "Update password", updating: "Updating…", sessions: "Active sessions", sessionsBody: "HandMeKey stores opaque server sessions. You can close sessions you no longer trust without exposing session tokens to the browser.", checking: "Checking active sessions…", thisBrowser: "This browser", other: "Another active session", current: "Current", lastActive: "Last active", created: "Created", expires: "Expires", close: "Close", closing: "Closing…", none: "No active sessions found.", signOutOthers: "Sign out other sessions", changed: "Password changed. Your previous sessions were closed and this session was securely rotated.", closed: "Session closed.", noOthers: "No other sessions were active."},
  trips: {eyebrow: "Guest account", title: "My trips", bodyPrefix: "Reservations linked to", bodySuffix: "Guest bookings can be linked only with their booking access token.", noTrips: "No trips linked yet", noTripsBody: "Book while signed in, or open an existing reservation in the browser that created it and link it to this account.", find: "Find a hotel", current: "Current stays", upcoming: "Upcoming trips", past: "Past trips", cancelled: "Cancelled / expired", noPhoto: "No photo", expected: "Expected arrival", openRequest: "open request", openRequests: "open requests", noRequests: "No open requests"},
  alerts: {eyebrow: "Account intelligence", title: "Alerts & watches", body: "Saved searches and live price monitoring use the same rates, promotions and availability shown at booking."}
};

const ar: typeof en = {
  language: {english: "English", arabic: "العربية", label: "اللغة"},
  nav: {stays: "الفنادق", trips: "حجوزاتي", alerts: "تنبيهات الأسعار", partner: "أضف منشأتك", account: "الحساب", signIn: "تسجيل الدخول", signOut: "تسجيل الخروج", signingOut: "جارٍ تسجيل الخروج…"},
  home: {
    kicker: "فنادق بأسعار واضحة",
    title: "اختر إقامتك واعرف السعر الذي ستدفعه فعليًا.",
    intro: "توفر مباشر، منشآت موثقة، تقييمات من نزلاء حقيقيين وشروط إلغاء واضحة قبل تأكيد الحجز.",
    verified: "منشآت موثقة", cancellation: "شروط إلغاء محفوظة", total: "السعر النهائي للإقامة",
    livePlaceholder: "ستظهر الإقامات المتاحة هنا", livePlaceholderSub: "نعرض فقط المنشآت النشطة والموثقة التي نشرت صورها.",
    where: "الوجهة", whereHint: "مدينة أو منطقة أو فندق", checkIn: "تسجيل الوصول", checkOut: "تسجيل المغادرة", guests: "الضيوف", adults: "البالغون", search: "ابحث عن إقامة",
    liveEyebrow: "متاح الآن على HandMeKey", liveTitle: "إقامات موثقة تستحق المشاهدة.", liveIntro: "لا تظهر المنشأة هنا إلا بعد مراجعتها واعتماد محتواها على المنصة.", explore: "استعرض كل الإقامات",
    noHotels: "لا توجد منشآت موثقة منشورة بعد", noHotelsSub: "تبقى المنشآت غير المكتملة أو غير الموثقة خاصة حتى تجتاز مراجعة النشر.",
    photoPending: "الصورة قيد الإضافة", verifiedLabel: "موثق", demoProperty: "منشأة تجريبية", review: "تقييم موثق", reviews: "تقييمات موثقة", checkPrice: "اعرض السعر المباشر",
    valueEyebrow: "تجربة مصممة حول الحجز", valueTitle: "وضوح أكبر من البحث حتى التأكيد.",
    finalTitle: "السعر النهائي أولًا", finalBody: "الخدمة والرسوم الإلزامية تدخل ضمن الإجمالي المحسوب من الخادم قبل الحجز.",
    policyTitle: "شروط محفوظة مع الحجز", policyBody: "نحفظ نسخة من سياسة الإلغاء وقت الحجز حتى لا تغيّر التعديلات اللاحقة شروطك الأصلية.",
    watchTitle: "راقب سعر إقامة حقيقية", watchBody: "تابع نفس الفندق والتواريخ، ويعيد HandMeKey احتساب السعر من الأسعار والمخزون والعروض الفعلية.",
    partnerEyebrow: "لشركاء الفنادق", partnerTitle: "أدرج منشأتك وتحكم بالسعر وتابع التحويل.", partnerBody: "تجمع بوابة الشركاء إعداد المنشأة والحجوزات والعروض ورسائل الضيوف ومؤشرات الأداء.", partnerCta: "استكشف بوابة الشركاء"
  },
  search: {
    destination: "الوجهة", checkIn: "الوصول", checkOut: "المغادرة", adults: "البالغون", children: "الأطفال", again: "ابحث من جديد",
    filter: "تصفية النتائج", nightly: "إجمالي الليلة", min: "الأدنى", max: "الأعلى", stars: "تصنيف النجوم", anyStars: "أي تصنيف", payment: "الدفع", anyPayment: "أي طريقة دفع", payHotel: "الدفع في الفندق", payNow: "الدفع الآن", sort: "الترتيب", recommended: "موصى به", lowPrice: "الأقل سعرًا", highPrice: "الأعلى سعرًا", highStars: "الأعلى نجومًا", freeCancel: "إلغاء مجاني الآن", facilities: "المرافق", apply: "تطبيق الفلاتر",
    live: "توفر مباشر", verifiedProperty: "منشأة موثقة", verifiedProperties: "منشآت موثقة", for: "للفترة", save: "حفظ البحث",
    badTitle: "راجع تفاصيل البحث", invalid: "بحث غير صالح", noneTitle: "لا توجد عروض مباشرة مطابقة", noneBody: "جرّب تواريخ أو عدد ضيوف مختلفًا أو قلّل الفلاتر. الأسعار غير المكتملة والمخزون غير المتاح لا يظهران في النتائج.",
    photoPending: "الصورة قيد الإضافة", verified: "موثق", demoProperty: "منشأة تجريبية", demoProperties: "منشآت تجريبية", review: "تقييم موثق", reviews: "تقييمات موثقة", off: "خصم", freeNow: "إلغاء مجاني الآن", penalty: "قد تطبق رسوم إلغاء", only: "تبقى", roomLeft: "غرفة لهذه التواريخ", roomsLeft: "غرف لهذه التواريخ", finalTotal: "السعر النهائي للإقامة", average: "متوسط الليلة", seeRooms: "عرض الغرف"
  },
  hotel: {
    back: "العودة إلى إقامات {city}", verified: "منشأة موثقة", demoProperty: "منشأة تجريبية", star: "نجوم", guestSignal: "تقييم ممتاز من الضيوف", stayReview: "تقييم إقامة موثق", stayReviews: "تقييمات إقامة موثقة", checkIn: "تسجيل الوصول", checkOut: "تسجيل المغادرة", propertyPolicy: "حسب سياسة المنشأة",
    noPhotos: "لم تنشر المنشأة صورها بعد.", finalPrice: "السعر النهائي قبل الحجز", liveInventory: "مخزون غرف مباشر", verifiedReviews: "تقييمات من إقامات موثقة فقط",
    property: "المنشأة", about: "عن {hotel}", noDescription: "لم تنشر المنشأة وصفًا بعد.", facilities: "المرافق", noFacilities: "لم تُنشر المرافق بعد.",
    yourStay: "إقامتك", chooseDates: "اختر التواريخ وشاهد الإجمالي المباشر.", adults: "البالغون", children: "الأطفال", availability: "تحقق من التوفر", invalidStay: "كانت بيانات الإقامة المطلوبة غير صالحة، لذلك تم تحميل التواريخ الافتراضية التالية.",
    available: "متاح لتواريخك", liveRate: "خطة سعر مباشرة", liveRates: "خطط سعر مباشرة", night: "ليلة", nights: "ليالٍ", totalsNote: "تشمل الإجماليات النهائية رسوم الخدمة والرسوم الإلزامية المعرّفة.", from: "ابتداءً من", stayTotal: "إجمالي الإقامة",
    noRooms: "لا توجد غرف قابلة للبيع لهذه الإقامة", noRoomsBody: "لا تظهر خطة السعر إلا إذا كانت كل الليالي مسعّرة وصالحة وبها مخزون متبقٍ.", room: "الغرفة", upTo: "حتى", adult: "بالغ", adultsPlural: "بالغين", package: "الباقة", cancellation: "الإلغاء", freeNow: "إلغاء مجاني الآن", currentPenalty: "رسوم الإلغاء الحالية", finalTotal: "السعر النهائي للإقامة", average: "متوسط الليلة", base: "الأساس", service: "الخدمة", tax: "الضريبة", choose: "اختر هذه الغرفة", only: "تبقى", left: "فقط",
    breakfast: "الإفطار مشمول", halfBoard: "إقامة نصفية", fullBoard: "إقامة كاملة", roomOnly: "غرفة فقط", payHotel: "الدفع في الفندق", payNow: "الدفع الآن",
    verifiedStays: "إقامات موثقة", reviewsTitle: "تقييمات الضيوف الفعلية.", noReviews: "لا توجد تقييمات موثقة بعد", noReviewsBody: "فقط الضيوف الذين أكملوا حجوزاتهم يمكنهم نشر تقييم.", outOf10: "من 10", verifiedStaysCount: "إقامات موثقة", cleanliness: "النظافة", staff: "الموظفون", location: "الموقع", comfort: "الراحة", value: "القيمة", verifiedStay: "إقامة موثقة", propertyResponse: "رد المنشأة"
  },
  checkout: {
    secure: "حجز آمن", title: "راجع السعر المباشر قبل التأكيد.", intro: "الإجمالي وطريقة الدفع وسياسة الإلغاء تأتي من نفس محرك الحجز الذي ينشئ حجزك.", session: "جلسة حساب آمنة", terms: "شروط الحجز محفوظة", selectionTitle: "يجب اختيار غرفة مباشرة", selectionBody: "اختر فندقًا وغرفة وخطة سعر قبل فتح صفحة الحجز. لا يستخدم HandMeKey مسار حجز تجريبي مخفي.", back: "العودة للبحث",
    checking: "جارٍ التحقق من السعر والتوفر…", loadFail: "تعذر تحميل هذه الإقامة", guestInfo: "بيانات الضيف", fullName: "الاسم الكامل", email: "البريد الإلكتروني", payment: "طريقة الدفع", payHotel: "الدفع في الفندق", payNow: "الدفع الآن", gatewayMissing: "بوابة الدفع الإلكتروني غير مهيأة", noPayment: "تتطلب هذه الخطة دفعًا إلكترونيًا حاليًا، لكن لا توجد بوابة دفع مهيأة لهذا التشغيل.", reserve: "احجز وتابع", securing: "جارٍ تثبيت الغرفة…", holdNote: "يتم تثبيت الغرفة مؤقتًا على الخادم وإعادة التحقق من السعر قبل تخفيض المخزون.", yourStay: "إقامتك", roomBase: "سعر الغرفة", service: "رسوم الخدمة", tax: "الضريبة / الرسوم الإلزامية", final: "الإجمالي النهائي", cancellation: "الإلغاء", noShow: "عدم الحضور", inventory: "المخزون المتاح للبيع", offIncluded: "خصم على السعر الأساسي ومحتسب بالفعل أدناه.", paymentAction: "بدأت عملية الدفع لكنها تحتاج إجراء من مزود الدفع قبل تأكيد الحجز."
  },
  login: {
    eyebrow: "إقامتك في مكان واحد", title: "احجز مرة واحتفظ بكل رحلاتك في متناولك.", intro: "سجّل الدخول لإدارة حجوزاتك ومراقبة أسعار الفنادق والاحتفاظ برسائلك مع المنشأة مرتبطة بالحجز.", verified: "حجوزات موثقة", verifiedSub: "افتح الإقامات المؤكدة وشروط الإلغاء.", alerts: "تنبيهات الأسعار", alertsSub: "راقب إقامة واحصل على تنبيه عند انخفاض السعر المباشر.", messages: "رسائل الفندق", messagesSub: "احتفظ بطلبات الضيف وردود المنشأة مع الحجز.", partner: "تدير فندقًا؟", partnerCta: "انتقل إلى بوابة الشركاء"
  },
  account: {
    my: "حسابي", overview: "نظرة عامة", profile: "البيانات الشخصية", security: "الأمان", trips: "حجوزاتي", alerts: "تنبيهات الأسعار", preferences: "التفضيلات",
    overviewEyebrow: "حساب المسافر", overviewTitle: "كل ما يتعلق بإقاماتك في مكان واحد.", overviewBody: "الحجوزات ومراقبة الأسعار وإعدادات الأمان مرتبطة بحسابك، وليس بالمتصفح الذي تستخدمه.",
    upcoming: "الحجوزات القادمة", activeWatches: "مراقبات السعر النشطة", unreadAlerts: "تنبيهات غير مقروءة", totalTrips: "إجمالي الحجوزات",
    profileCard: "البيانات الشخصية", profileCardBody: "حدّث الاسم الذي نستخدمه لتعبئة الحجوزات الجديدة تلقائيًا.", securityCard: "الأمان", securityCardBody: "غيّر كلمة المرور وأغلق الجلسات التي لم تعد تثق بها.", tripsCard: "الحجوزات", tripsCardBody: "افتح الحجوزات الحالية والقادمة والسابقة والملغاة.", alertsCard: "متابعة الأسعار", alertsCardBody: "أدر عمليات البحث المحفوظة ومراقبة الأسعار والتنبيهات داخل الحساب.", open: "فتح",
    prefTitle: "اللغة", prefBody: "اختر لغة صفحات HandMeKey للعملاء. عند تسجيل الدخول تتبع اللغة حسابك على أجهزتك الأخرى.", english: "English", arabic: "العربية"
  },
  profile: {eyebrow: "ملف الحساب", title: "البيانات الشخصية", body: "حافظ على دقة البيانات التي نستخدمها لتعبئة حجوزاتك القادمة. يبقى بريد تسجيل الدخول محميًا حتى نوفر تغيير البريد مع التحقق.", fullName: "الاسم الكامل", email: "بريد تسجيل الدخول", protected: "البريد الإلكتروني محمي.", protectedBody: "لن يسمح HandMeKey بتغيير البريد إلا بعد ربط مسار تحقق حقيقي بالبريد. لن نستبدل هوية الدخول بصمت.", smart: "حجز أسرع.", smartBody: "نعبئ اسم الحساب وبريد تسجيل الدخول تلقائيًا عند الحجز، مع بقاء إمكانية تغيير اسم الضيف في كل حجز.", saved: "تم حفظ البيانات الشخصية.", save: "حفظ التغييرات", saving: "جارٍ الحفظ…"},
  security: {eyebrow: "حماية الحساب", title: "الأمان", body: "غيّر كلمة المرور وراجع جلسات الخادم النشطة دون كشف رموز المصادقة للمتصفح.", change: "تغيير كلمة المرور", changeBody: "عند تغيير كلمة المرور تُغلق كل الجلسات الحالية وتُنشأ جلسة جديدة لهذا المتصفح.", currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة", hint: "استخدم 12 حرفًا على الأقل.", update: "تحديث كلمة المرور", updating: "جارٍ التحديث…", sessions: "الجلسات النشطة", sessionsBody: "يحفظ HandMeKey جلسات خادم غير قابلة للقراءة. يمكنك إغلاق أي جلسة لم تعد تثق بها دون كشف رمز الجلسة.", checking: "جارٍ فحص الجلسات النشطة…", thisBrowser: "هذا المتصفح", other: "جلسة نشطة أخرى", current: "الحالية", lastActive: "آخر نشاط", created: "أُنشئت", expires: "تنتهي", close: "إغلاق", closing: "جارٍ الإغلاق…", none: "لا توجد جلسات نشطة.", signOutOthers: "تسجيل الخروج من الجلسات الأخرى", changed: "تم تغيير كلمة المرور وإغلاق الجلسات السابقة وتدوير جلسة هذا المتصفح بأمان.", closed: "تم إغلاق الجلسة.", noOthers: "لا توجد جلسات أخرى نشطة."},
  trips: {eyebrow: "حساب الضيف", title: "حجوزاتي", bodyPrefix: "الحجوزات المرتبطة بـ", bodySuffix: "لا يمكن ربط حجز ضيف بالحساب إلا باستخدام رمز الوصول الخاص بالحجز.", noTrips: "لا توجد حجوزات مرتبطة بعد", noTripsBody: "احجز وأنت مسجل الدخول، أو افتح حجزًا موجودًا في المتصفح الذي أنشأه واربطه بهذا الحساب.", find: "ابحث عن فندق", current: "الإقامات الحالية", upcoming: "الحجوزات القادمة", past: "الحجوزات السابقة", cancelled: "ملغاة / منتهية", noPhoto: "لا توجد صورة", expected: "الوصول المتوقع", openRequest: "طلب مفتوح", openRequests: "طلبات مفتوحة", noRequests: "لا توجد طلبات مفتوحة"},
  alerts: {eyebrow: "ذكاء الحساب", title: "التنبيهات ومراقبة الأسعار", body: "تستخدم عمليات البحث المحفوظة ومراقبة الأسعار نفس الأسعار والعروض والتوفر الظاهر عند الحجز."}
};

export function dictionary(locale: Locale) {
  return locale === "ar" ? ar : en;
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
