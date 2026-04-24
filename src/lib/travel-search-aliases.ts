// Arabic ↔ English aliases for popular Middle East / world airports & cities.
// Used to make the airport/airline combobox searchable by Arabic terms.

export const CITY_ALIASES: Record<string, string[]> = {
  // Saudi Arabia
  'الرياض': ['riyadh', 'ruh'],
  'جدة': ['jeddah', 'jed'],
  'جده': ['jeddah', 'jed'],
  'الدمام': ['dammam', 'dmm'],
  'المدينة': ['medina', 'med'],
  'المدينه': ['medina', 'med'],
  'مكة': ['mecca', 'makkah'],
  'مكه': ['mecca', 'makkah'],
  'الطائف': ['taif', 'tif'],
  'تبوك': ['tabuk', 'tuu'],
  'أبها': ['abha', 'abt'],
  'ابها': ['abha', 'abt'],
  'حائل': ['hail', 'hai'],
  'نجران': ['najran', 'eam'],
  'الجوف': ['al jouf', 'ajf'],
  'ينبع': ['yenbo', 'yenbu', 'yns'],

  // UAE
  'دبي': ['dubai', 'dxb'],
  'أبو ظبي': ['abu dhabi', 'auh'],
  'ابو ظبي': ['abu dhabi', 'auh'],
  'أبوظبي': ['abu dhabi', 'auh'],
  'ابوظبي': ['abu dhabi', 'auh'],
  'الشارقة': ['sharjah', 'shj'],
  'الشارقه': ['sharjah', 'shj'],
  'رأس الخيمة': ['ras al khaimah', 'rkt'],
  'الفجيرة': ['fujairah', 'fjr'],
  'العين': ['al ain', 'aan'],

  // Egypt
  'القاهرة': ['cairo', 'cai'],
  'القاهره': ['cairo', 'cai'],
  'الإسكندرية': ['alexandria', 'alexandria borg el arab', 'hbe', 'alyborg el arab'],
  'الاسكندرية': ['alexandria', 'hbe'],
  'شرم الشيخ': ['sharm el sheikh', 'ssh'],
  'الغردقة': ['hurghada', 'hrg'],
  'الغردقه': ['hurghada', 'hrg'],
  'الأقصر': ['luxor', 'lxr'],
  'الاقصر': ['luxor', 'lxr'],
  'أسوان': ['aswan', 'asw'],
  'اسوان': ['aswan', 'asw'],
  'مرسى علم': ['marsa alam', 'rmf'],
  'مرسي علم': ['marsa alam', 'rmf'],
  'العلمين': ['el alamein', 'dba'],

  // Qatar / Bahrain / Kuwait / Oman
  'الدوحة': ['doha', 'doh'],
  'الدوحه': ['doha', 'doh'],
  'البحرين': ['bahrain', 'manama', 'bah'],
  'المنامة': ['manama', 'bah'],
  'الكويت': ['kuwait', 'kwi'],
  'مسقط': ['muscat', 'mct'],
  'صلالة': ['salalah', 'sll'],
  'صلاله': ['salalah', 'sll'],

  // Jordan / Lebanon / Syria / Iraq
  'عمان': ['amman', 'amm'],
  'العقبة': ['aqaba', 'aqj'],
  'العقبه': ['aqaba', 'aqj'],
  'بيروت': ['beirut', 'bey'],
  'دمشق': ['damascus', 'dam'],
  'حلب': ['aleppo', 'alp'],
  'بغداد': ['baghdad', 'bgw'],
  'البصرة': ['basra', 'bsr'],
  'البصره': ['basra', 'bsr'],
  'أربيل': ['erbil', 'ebl'],
  'اربيل': ['erbil', 'ebl'],
  'النجف': ['najaf', 'njf'],

  // Turkey
  'إسطنبول': ['istanbul', 'ist', 'saw'],
  'اسطنبول': ['istanbul', 'ist', 'saw'],
  'أنقرة': ['ankara', 'esb'],
  'انقرة': ['ankara', 'esb'],
  'أنطاليا': ['antalya', 'ayt'],
  'انطاليا': ['antalya', 'ayt'],
  'إزمير': ['izmir', 'adb'],
  'ازمير': ['izmir', 'adb'],
  'طرابزون': ['trabzon', 'tzx'],
  'بودروم': ['bodrum', 'bjv'],

  // North Africa
  'تونس': ['tunis', 'tun'],
  'الجزائر': ['algiers', 'alg'],
  'الدار البيضاء': ['casablanca', 'cmn'],
  'كازابلانكا': ['casablanca', 'cmn'],
  'مراكش': ['marrakech', 'rak'],
  'الرباط': ['rabat', 'rba'],
  'طرابلس': ['tripoli', 'tip'],
  'الخرطوم': ['khartoum', 'krt'],

  // Iran / Asia
  'طهران': ['tehran', 'ika', 'thr'],
  'مشهد': ['mashhad', 'mhd'],
  'كراتشي': ['karachi', 'khi'],
  'إسلام آباد': ['islamabad', 'isb'],
  'اسلام اباد': ['islamabad', 'isb'],
  'لاهور': ['lahore', 'lhe'],
  'دكا': ['dhaka', 'dac'],
  'كوالالمبور': ['kuala lumpur', 'kul'],
  'سنغافورة': ['singapore', 'sin'],
  'سنغافوره': ['singapore', 'sin'],
  'بانكوك': ['bangkok', 'bkk', 'dmk'],
  'دلهي': ['delhi', 'del'],
  'مومباي': ['mumbai', 'bom'],
  'بكين': ['beijing', 'pek', 'pkx'],
  'شنغهاي': ['shanghai', 'pvg', 'sha'],
  'طوكيو': ['tokyo', 'hnd', 'nrt'],
  'سيول': ['seoul', 'icn'],

  // Europe
  'لندن': ['london', 'lhr', 'lgw', 'stn'],
  'باريس': ['paris', 'cdg', 'ory'],
  'فرانكفورت': ['frankfurt', 'fra'],
  'ميونخ': ['munich', 'muc'],
  'برلين': ['berlin', 'ber'],
  'روما': ['rome', 'fco'],
  'ميلانو': ['milan', 'mxp', 'lin'],
  'مدريد': ['madrid', 'mad'],
  'برشلونة': ['barcelona', 'bcn'],
  'برشلونه': ['barcelona', 'bcn'],
  'أمستردام': ['amsterdam', 'ams'],
  'امستردام': ['amsterdam', 'ams'],
  'فيينا': ['vienna', 'vie'],
  'زيورخ': ['zurich', 'zrh'],
  'جنيف': ['geneva', 'gva'],
  'بروكسل': ['brussels', 'bru'],
  'موسكو': ['moscow', 'svo', 'dme', 'vko'],
  'أثينا': ['athens', 'ath'],
  'اثينا': ['athens', 'ath'],

  // Americas
  'نيويورك': ['new york', 'jfk', 'ewr', 'lga'],
  'لوس أنجلوس': ['los angeles', 'lax'],
  'لوس انجلوس': ['los angeles', 'lax'],
  'شيكاغو': ['chicago', 'ord'],
  'تورنتو': ['toronto', 'yyz'],
  'مونتريال': ['montreal', 'yul'],
  'ساو باولو': ['sao paulo', 'gru'],
  'بوينس آيرس': ['buenos aires', 'eze'],
};

export const AIRLINE_ALIASES: Record<string, string[]> = {
  'السعودية': ['saudia', 'saudi arabian airlines', 'sv'],
  'السعوديه': ['saudia', 'sv'],
  'الإمارات': ['emirates', 'ek'],
  'الاماراتية': ['emirates', 'ek'],
  'الاتحاد': ['etihad', 'ey'],
  'الاتحاد للطيران': ['etihad', 'ey'],
  'القطرية': ['qatar airways', 'qr'],
  'القطريه': ['qatar airways', 'qr'],
  'الكويتية': ['kuwait airways', 'ku'],
  'الجزيرة': ['jazeera airways', 'j9'],
  'العربية': ['air arabia', 'g9'],
  'فلاي دبي': ['flydubai', 'fz'],
  'مصر للطيران': ['egyptair', 'ms'],
  'مصرللطيران': ['egyptair', 'ms'],
  'العمانية': ['oman air', 'wy'],
  'الخليج': ['gulf air', 'gf'],
  'النيل': ['nile air', 'ni'],
  'الملكية الأردنية': ['royal jordanian', 'rj'],
  'المغربية': ['royal air maroc', 'at'],
  'التركية': ['turkish airlines', 'tk'],
  'الخطوط التركية': ['turkish airlines', 'tk'],
  'ايران اير': ['iran air', 'ir'],
  'لوفتهانزا': ['lufthansa', 'lh'],
  'إير فرانس': ['air france', 'af'],
  'البريطانية': ['british airways', 'ba'],
  'KLM': ['klm', 'kl'],
  'كي إل إم': ['klm', 'kl'],
};

/**
 * Expand a search term with Arabic aliases. Returns the original term plus
 * any aliased English equivalents, so the consumer can match against any.
 */
export function expandSearchTerm(term: string, aliasMap: Record<string, string[]>): string[] {
  const t = term.trim().toLowerCase();
  if (!t) return [t];
  const expansions = new Set<string>([t]);
  for (const [arabic, englishes] of Object.entries(aliasMap)) {
    if (arabic.toLowerCase().includes(t) || t.includes(arabic.toLowerCase())) {
      englishes.forEach((e) => expansions.add(e));
    }
  }
  return Array.from(expansions);
}

// Country codes considered "regional" for Middle East / North Africa users.
// These records will be sorted to the top of the initial (no-search) view.
export const REGIONAL_COUNTRIES = new Set([
  'SA', 'AE', 'EG', 'QA', 'BH', 'KW', 'OM', 'JO', 'LB', 'SY', 'IQ',
  'YE', 'PS', 'TR', 'TN', 'DZ', 'MA', 'LY', 'SD', 'IR',
]);
