/**
 * Single authoritative frontend destination catalog for trip-intent parsing.
 * Built ONLY from data the app already ships (Globe dataset, curated list,
 * legacy labels, generic Indian states gazetteer). No per-destination `if`s.
 */
import { DESTINATIONS } from '../data/destinations';
import { curatedDestinations, knownDestinations } from '../mocks/traveler';

export interface CatalogPlace {
  label: string;
  aliases: string[];
  source: 'globe' | 'curated' | 'legacy' | 'state' | 'city' | 'spot' | 'religious';
  /** Optional religious/travel category (Hindu, Sikh, Buddhist, Jain, …). */
  category?: string;
  /** Optional state/UT association for display and metadata only. */
  state?: string;
}

/** Structured religious-site catalog row (one row per shrine/destination). */
interface ReligiousSite {
  label: string;
  aliases?: string[];
  /** Religious tradition or 'Religious Heritage' for non-shrine monuments. */
  category: string;
  /** State/UT (or explicit cross-border note for corridor sites). */
  state: string;
  /** Extra searchable keywords — merged into the same alias match set. */
  keywords?: string[];
}

export function normalizePlaceText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generic Indian states + union territories (geographic gazetteer). */
const INDIAN_STATES_AND_UTS: Array<{ label: string; aliases?: string[] }> = [
  { label: 'Andhra Pradesh', aliases: ['andhra'] },
  { label: 'Arunachal Pradesh', aliases: ['arunachal'] },
  { label: 'Assam' },
  { label: 'Bihar' },
  { label: 'Chhattisgarh', aliases: ['chattisgarh'] },
  { label: 'Goa' },
  { label: 'Gujarat' },
  { label: 'Haryana' },
  { label: 'Himachal Pradesh', aliases: ['himachal'] },
  { label: 'Jharkhand' },
  { label: 'Karnataka' },
  { label: 'Kerala' },
  { label: 'Madhya Pradesh', aliases: ['madhyapradesh', 'mp'] },
  { label: 'Maharashtra' },
  { label: 'Manipur' },
  { label: 'Meghalaya' },
  { label: 'Mizoram' },
  { label: 'Nagaland' },
  { label: 'Odisha', aliases: ['orissa'] },
  { label: 'Punjab' },
  { label: 'Rajasthan' },
  { label: 'Sikkim' },
  { label: 'Tamil Nadu', aliases: ['tamilnadu'] },
  { label: 'Telangana' },
  { label: 'Tripura' },
  { label: 'Uttar Pradesh', aliases: ['uttarpradesh', 'up'] },
  { label: 'Uttarakhand', aliases: ['uttaranchal'] },
  { label: 'West Bengal', aliases: ['bengal', 'westbengal'] },
  { label: 'Jammu and Kashmir', aliases: ['jammu kashmir', 'kashmir', 'jammu'] },
  { label: 'Ladakh', aliases: ['leh ladakh'] },
  { label: 'Delhi', aliases: ['new delhi', 'delhi ncr', 'ncr', 'dilli'] },
  { label: 'Puducherry', aliases: ['pondicherry', 'pondi', 'puducherry ut'] },
  { label: 'Chandigarh' },
  { label: 'Lakshadweep' },
  { label: 'Andaman and Nicobar Islands', aliases: ['andaman and nicobar', 'andaman', 'andaman islands', 'nicobar'] },
  { label: 'Dadra and Nagar Haveli and Daman and Diu', aliases: ['dadra', 'nagar haveli', 'daman', 'diu'] },
];

/** Major/famous Indian cities: destinations AND origins. Label → aliases. */
const MAJOR_INDIAN_CITIES: Array<{ label: string; aliases?: string[] }> = [
  { label: 'Mumbai', aliases: ['bombay', 'navi mumbai'] },
  { label: 'Pune', aliases: ['poona'] },
  { label: 'Nagpur' },
  { label: 'Nashik', aliases: ['nasik'] },
  { label: 'Chhatrapati Sambhajinagar', aliases: ['aurangabad', 'sambhajinagar'] },
  { label: 'Kolhapur' },
  { label: 'Thane' },
  { label: 'Solapur', aliases: ['sholapur'] },
  { label: 'Noida' },
  { label: 'Gurugram', aliases: ['gurgaon'] },
  { label: 'Faridabad' },
  { label: 'Ghaziabad' },
  { label: 'Meerut' },
  { label: 'Ajmer' },
  { label: 'Kota' },
  { label: 'Bikaner' },
  { label: 'Pushkar' },
  { label: 'Mount Abu', aliases: ['mountabu', 'abu'] },
  { label: 'Ahmedabad', aliases: ['amdavad'] },
  { label: 'Surat' },
  { label: 'Vadodara', aliases: ['baroda'] },
  { label: 'Rajkot' },
  { label: 'Bengaluru', aliases: ['bangalore', 'bengalooru'] },
  { label: 'Mysuru', aliases: ['mysore'] },
  { label: 'Mangaluru', aliases: ['mangalore'] },
  { label: 'Hubli', aliases: ['hubballi'] },
  { label: 'Vijayawada', aliases: ['bezawada'] },
  { label: 'Visakhapatnam', aliases: ['vizag'] },
  { label: 'Tirupati' },
  { label: 'Chennai', aliases: ['madras'] },
  { label: 'Coimbatore', aliases: ['kovai'] },
  { label: 'Madurai' },
  { label: 'Tiruchirappalli', aliases: ['trichy'] },
  { label: 'Thiruvananthapuram', aliases: ['trivandrum'] },
  { label: 'Kozhikode', aliases: ['calicut'] },
  { label: 'Kolkata', aliases: ['calcutta'] },
  { label: 'Howrah' },
  { label: 'Cuttack' },
  { label: 'Patna' },
  { label: 'Ranchi' },
  { label: 'Dhanbad' },
  { label: 'Raipur' },
  { label: 'Bhopal' },
  { label: 'Indore' },
  { label: 'Gwalior' },
  { label: 'Jabalpur' },
  { label: 'Amritsar' },
  { label: 'Ludhiana' },
  { label: 'Jalandhar', aliases: ['jullundur'] },
  { label: 'Kasol' },
  { label: 'Dalhousie' },
  { label: 'Gulmarg' },
  { label: 'Pahalgam' },
  { label: 'Sonamarg', aliases: ['sonmarg'] },
  { label: 'Mathura' },
  { label: 'Vrindavan', aliases: ['brindavan'] },
  { label: 'Kanpur' },
  { label: 'Gorakhpur' },
  { label: 'Aligarh' },
  { label: 'Moradabad' },
  { label: 'Bareilly' },
];

/** Famous tourist spots (not cities/states). One row per spot, never parser code. */
const FAMOUS_TOURIST_SPOTS: Array<{ label: string; aliases?: string[] }> = [
  { label: 'Taj Mahal', aliases: ['taj', 'tajmahal'] },
  { label: 'Munnar' },
  { label: 'Alappuzha', aliases: ['alleppey'] },
  { label: 'Wayanad' },
  { label: 'Kovalam' },
  { label: 'Varkala' },
  { label: 'Thekkady', aliases: ['periyar'] },
  { label: 'Ooty', aliases: ['udhagamandalam'] },
  { label: 'Kodaikanal', aliases: ['kodai'] },
  { label: 'Coorg', aliases: ['kodagu', 'madikeri'] },
  { label: 'Hampi', aliases: ['vijayanagara'] },
  { label: 'Gokarna' },
  { label: 'Mahabalipuram', aliases: ['mamallapuram'] },
  { label: 'Rameswaram', aliases: ['rameshwaram'] },
  { label: 'Kanyakumari', aliases: ['cape comorin'] },
  { label: 'Jaisalmer', aliases: ['golden city'] },
  { label: 'Rann of Kutch', aliases: ['rann', 'kutch'] },
  { label: 'Khajuraho', aliases: ['khajuraho temples'] },
  { label: 'Sanchi', aliases: ['sanchi stupa'] },
  { label: 'Kanha National Park', aliases: ['kanha'] },
  { label: 'Bandhavgarh National Park', aliases: ['bandhavgarh'] },
  { label: 'Ajanta Caves', aliases: ['ajanta'] },
  { label: 'Ellora Caves', aliases: ['ellora', 'kailasa temple'] },
  { label: 'Lonavala', aliases: ['lonavla', 'khandala'] },
  { label: 'Mahabaleshwar' },
  { label: 'Alibaug', aliases: ['alibag'] },
  { label: 'Tarkarli' },
  { label: 'Mussoorie' },
  { label: 'Nainital' },
  { label: 'Jim Corbett', aliases: ['corbett'] },
  { label: 'Auli' },
  { label: 'Bir Billing', aliases: ['bir', 'billing'] },
  { label: 'Spiti', aliases: ['spiti valley'] },
  { label: 'Nubra', aliases: ['nubra valley', 'pangong', 'pangong tso'] },
  { label: 'Kaziranga National Park', aliases: ['kaziranga'] },
  { label: 'Cherrapunji', aliases: ['sohra', 'cherrapunjee'] },
  { label: 'Tawang' },
  { label: 'Puri', aliases: ['jagannath puri'] },
  { label: 'Konark', aliases: ['konark sun temple'] },
  { label: 'Sundarbans National Park', aliases: ['sundarbans'] },
  { label: 'Havelock', aliases: ['havelock island', 'swaraj dweep'] },
];

/* ────────────────────────────────────────────────────────────────────────
 * Religious & pilgrimage destinations (structured rows, NOT parser branches).
 * Same generic catalog pipeline: each row contributes its canonical label
 * plus normalized aliases/keywords to the shared match set. Loaded AFTER the
 * city/spot layers, so an existing canonical entry (e.g. Amritsar, Puri,
 * Varanasi) gains these aliases instead of becoming a duplicate entity.
 * ──────────────────────────────────────────────────────────────────────── */
const RELIGIOUS_SITES: ReligiousSite[] = [
  /* ── Hindu — Jammu & Kashmir / Ladakh ── */
  { label: 'Vaishno Devi', aliases: ['vaishno devi', 'mata vaishno devi', 'katra', 'vaishno devi katra', 'vaishnodevi'], category: 'Hindu', state: 'Jammu & Kashmir' },
  { label: 'Amarnath', aliases: ['amarnath', 'amarnath cave', 'amarnath yatra', 'baba amarnath'], category: 'Hindu', state: 'Jammu & Kashmir' },
  { label: 'Shiv Khori', aliases: ['shiv khori', 'shivkhori'], category: 'Hindu', state: 'Jammu & Kashmir' },
  { label: 'Kheer Bhawani', aliases: ['kheer bhawani', 'kheer bhawani temple', 'tulmula'], category: 'Hindu', state: 'Jammu & Kashmir' },
  { label: 'Shankaracharya Temple', aliases: ['shankaracharya temple', 'shankaracharya', 'sankaracharya temple'], category: 'Hindu', state: 'Jammu & Kashmir' },
  { label: 'Martand Sun Temple', aliases: ['martand sun temple', 'martand temple'], category: 'Religious Heritage', state: 'Jammu & Kashmir' },
  { label: 'Mana Village', aliases: ['mana village', 'mana pass'], category: 'Hindu', state: 'Uttarakhand' },

  /* ── Hindu — Uttarakhand ── */
  { label: 'Badrinath', aliases: ['badrinath', 'badrinath temple', 'badri'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Kedarnath', aliases: ['kedarnath', 'kedarnath temple'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Gangotri', aliases: ['gangotri', 'gangotri temple'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Yamunotri', aliases: ['yamunotri', 'yamunotri temple'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Devprayag', aliases: ['devprayag', 'dev prayag'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Joshimath', aliases: ['joshimath', 'jyotirmath'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Tungnath', aliases: ['tungnath', 'tungnath temple'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Rudraprayag', aliases: ['rudraprayag', 'rudra prayag'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Jageshwar', aliases: ['jageshwar', 'jageshwar dham'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Purnagiri', aliases: ['purnagiri', 'purnagiri temple'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Neelkanth Mahadev Temple', aliases: ['neelkanth mahadev', 'neelkanth temple'], category: 'Hindu', state: 'Uttarakhand' },
  { label: 'Dhari Devi Temple', aliases: ['dhari devi'], category: 'Hindu', state: 'Uttarakhand' },

  /* ── Hindu — Uttar Pradesh ── */
  { label: 'Varanasi', aliases: ['kashi vishwanath', 'kashi vishwanath temple', 'vishwanath temple', 'vishwanath', 'kaal bhairav'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Ayodhya', aliases: ['ram mandir', 'ram janmabhoomi', 'ayodhya ram mandir', 'hanuman garhi'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Mathura', aliases: ['krishna janmabhoomi', 'krishna janmasthan'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Vrindavan', aliases: ['banke bihari', 'banke bihari temple', 'prem mandir', 'iskcon vrindavan'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Prayagraj', aliases: ['triveni sangam', 'sangam prayagraj', 'kumbh prayagraj'], category: 'Multi-faith', state: 'Uttar Pradesh' },
  { label: 'Vindhyachal', aliases: ['vindhyachal', 'vindhyavasini', 'vindhyachal dham'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Chitrakoot', aliases: ['chitrakoot', 'chitrakut', 'chitrakoot dham'], category: 'Hindu', state: 'Madhya Pradesh / Uttar Pradesh' },
  { label: 'Gorakhpur', aliases: ['gorakhnath', 'gorakhnath temple', 'gorakhnath math'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Naimisharanya', aliases: ['naimisharanya', 'neemsar', 'nimsar'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Barsana', aliases: ['barsana', 'radha rani temple', 'ladli ji'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Govardhan', aliases: ['govardhan', 'govardhan parvat', 'govardhan hill'], category: 'Hindu', state: 'Uttar Pradesh' },
  { label: 'Gokul', aliases: ['gokul', 'gokul dham'], category: 'Hindu', state: 'Uttar Pradesh' },

  /* ── Hindu / Jain / Islamic / Parsi — Rajasthan & Gujarat ── */
  { label: 'Pushkar', aliases: ['pushkar', 'brahma temple', 'pushkar brahma temple', 'pushkar sarovar'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Ajmer', aliases: ['ajmer sharif', 'ajmer sharif dargah', 'ajmer dargah', 'khwaja moinuddin chishti', 'dargah sharif'], category: 'Multi-faith', state: 'Rajasthan' },
  { label: 'Nathdwara', aliases: ['nathdwara', 'shrinathji', 'shrinath ji'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Salasar Balaji', aliases: ['salasar', 'salasar balaji'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Khatu Shyam Ji', aliases: ['khatu shyam', 'khatu shyam ji', 'khatu'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Mehandipur Balaji', aliases: ['mehandipur', 'mehandipur balaji'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Eklingji', aliases: ['eklingji', 'eklingji temple'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Karni Mata Temple', aliases: ['karni mata', 'karni mata temple', 'deshnok', 'deshnoke'], category: 'Hindu', state: 'Rajasthan' },
  { label: 'Ranakpur Jain Temple', aliases: ['ranakpur', 'ranakpur jain temple'], category: 'Jain', state: 'Rajasthan' },
  { label: 'Dilwara Temples', aliases: ['dilwara', 'dilwara jain temple', 'dilwara temples'], category: 'Jain', state: 'Rajasthan' },
  { label: 'Somnath', aliases: ['somnath', 'somnath temple', 'somnath jyotirlinga'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Dwarka', aliases: ['dwarka', 'dwaraka', 'dwarkadhish', 'dwarkadhish temple'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Bet Dwarka', aliases: ['bet dwarka', 'betdwarka', 'shankhodhar'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Dakor', aliases: ['dakor', 'dakor ranchodrai', 'ranchhodrai'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Ambaji', aliases: ['ambaji', 'arasuri ambaji', 'ambaji temple'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Modhera', aliases: ['modhera', 'modhera sun temple'], category: 'Religious Heritage', state: 'Gujarat' },
  { label: 'Akshardham Gandhinagar', aliases: ['akshardham', 'akshardham gandhinagar', 'swaminarayan akshardham'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Pavagadh', aliases: ['pavagadh', 'pavagadh kalika mata', 'kalika mata pavagadh'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Girnar', aliases: ['girnar', 'girnar jain temples', 'girnar parikrama'], category: 'Multi-faith', state: 'Gujarat' },
  { label: 'Siddhpur', aliases: ['siddhpur', 'siddhpur rudra mahalaya', 'matrugaya'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Bhalka Tirth', aliases: ['bhalka', 'bhalka tirth', 'bhalka teerth'], category: 'Hindu', state: 'Gujarat' },
  { label: 'Palitana', aliases: ['palitana', 'palitana jain temple', 'shatrunjaya', 'shatrunjay'], category: 'Jain', state: 'Gujarat' },
  { label: 'Udvada', aliases: ['udvada', 'udvada atash behram', 'iranshah atash behram'], category: 'Zoroastrian', state: 'Gujarat' },
  { label: 'Sanjan', aliases: ['sanjan', 'sanjan stambh'], category: 'Zoroastrian', state: 'Gujarat' },

  /* ── Hindu / Buddhist — Maharashtra ── */
  { label: 'Shirdi', aliases: ['shirdi', 'sai baba', 'sai baba temple', 'shirdi sai'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Trimbakeshwar', aliases: ['trimbakeshwar', 'trimbak', 'trimbakeshwar jyotirlinga'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Nashik', aliases: ['panchavati', 'panchvati', 'kalaram temple'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Bhimashankar', aliases: ['bhimashankar', 'bhimashankar jyotirlinga'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Grishneshwar', aliases: ['grishneshwar', 'ghrishneshwar'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Aundha Nagnath', aliases: ['aundha nagnath', 'nagnath temple'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Parli Vaijnath', aliases: ['parli vaijnath', 'vaijnath temple'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Tuljapur', aliases: ['tuljapur', 'tulja bhavani', 'tuljabhavani'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Pandharpur', aliases: ['pandharpur', 'vitthal', 'vithoba', 'vitthal rukmini'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Jejuri', aliases: ['jejuri', 'khandoba'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Alandi', aliases: ['alandi', 'dnyaneshwar', 'gyanadev'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Dehu', aliases: ['dehu', 'tukaram'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Nanded', aliases: ['nanded', 'hazur sahib', 'takht sachkhand sri hazur sahib', 'hazur sahib nanded'], category: 'Sikh', state: 'Maharashtra' },
  { label: 'Ganpatipule', aliases: ['ganpatipule', 'ganpatipule temple'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Morgaon', aliases: ['morgaon', 'mayureshwar'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Siddhatek', aliases: ['siddhatek', 'siddhivinayak siddhatek'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Pali Ganpati', aliases: ['pali ganpati', 'ballaleshwar'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Mahad', aliases: ['mahad', 'varadvinayak'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Ranjangaon', aliases: ['ranjangaon', 'mahaganpati ranjangaon'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Theur', aliases: ['theur', 'chintamani theur'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Lenadri', aliases: ['lenadri', 'lenyadri', 'girijatmaj'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Ozar', aliases: ['ozar', 'vighnahar ozar'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Akkalkot', aliases: ['akkalkot', 'swami samarth'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Shegaon', aliases: ['shegaon', 'gajanan maharaj'], category: 'Hindu', state: 'Maharashtra' },
  { label: 'Deekshabhoomi', aliases: ['deekshabhoomi', 'dikshabhoomi', 'deeksha bhoomi'], category: 'Buddhist', state: 'Maharashtra' },

  /* ── Hindu / Christian — Goa ── */
  { label: 'Mangeshi Temple', aliases: ['mangeshi', 'mangeshi temple', 'mangueshi'], category: 'Hindu', state: 'Goa' },
  { label: 'Shantadurga Temple', aliases: ['shantadurga', 'shantadurga kavlem'], category: 'Hindu', state: 'Goa' },
  { label: 'Mahalasa Temple', aliases: ['mahalasa', 'mahalasa narayani'], category: 'Hindu', state: 'Goa' },
  { label: 'Shri Damodar Temple', aliases: ['damodar temple goa', 'shri damodar'], category: 'Hindu', state: 'Goa' },
  { label: 'Shri Nagesh Temple', aliases: ['nagesh temple', 'nageshi temple'], category: 'Hindu', state: 'Goa' },
  { label: 'Basilica of Bom Jesus', aliases: ['bom jesus', 'bom jesus basilica', 'basilica of bom jesus', 'old goa basilica'], category: 'Christian', state: 'Goa' },
  { label: 'Se Cathedral', aliases: ['se cathedral', 'se cathedral old goa'], category: 'Christian', state: 'Goa' },
  { label: 'Old Goa', aliases: ['old goa', 'velha goa', 'goa velha'], category: 'Religious Heritage', state: 'Goa' },

  /* ── Hindu / Jain / Christian — Karnataka ── */
  { label: 'Udupi', aliases: ['udupi', 'udupi krishna', 'krishna temple udupi'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Gokarna', aliases: ['gokarna mahabaleshwar', 'mahabaleshwar temple gokarna'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Murudeshwar', aliases: ['murudeshwar', 'murudeshwara', 'murudeshwar temple'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Kukke Subramanya', aliases: ['kukke subramanya', 'kukke', 'subramanya temple'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Dharmasthala', aliases: ['dharmasthala', 'dharmastala', 'manjunatha'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Sringeri', aliases: ['sringeri', 'sringeri sharada peetham'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Kollur Mookambika', aliases: ['kollur', 'mookambika', 'kollur mookambika'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Hampi', aliases: ['virupaksha', 'virupaksha temple'], category: 'Religious Heritage', state: 'Karnataka' },
  { label: 'Melukote', aliases: ['melukote', 'melkote', 'cheluva narayana'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Chamundeshwari Temple', aliases: ['chamundeshwari', 'chamundi hills', 'chamundeshwari temple'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Talakaveri', aliases: ['talakaveri', 'talacauvery'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Kateel', aliases: ['kateel', 'kateel durga'], category: 'Hindu', state: 'Karnataka' },
  { label: 'Badami', aliases: ['badami', 'badami cave temples'], category: 'Religious Heritage', state: 'Karnataka' },
  { label: 'Shravanabelagola', aliases: ['shravanabelagola', 'gommateshwara', 'bahubali statue'], category: 'Jain', state: 'Karnataka' },
  { label: 'Namdroling Monastery', aliases: ['namdroling', 'namdroling monastery', 'bylakuppe'], category: 'Buddhist', state: 'Karnataka' },
  { label: 'St. Philomena\u2019s Cathedral', aliases: ['st philomenas', 'philomena cathedral', 'st philomena church'], category: 'Christian', state: 'Karnataka' },

  /* ── Hindu / Christian — Tamil Nadu, Puducherry ── */
  { label: 'Rameswaram', aliases: ['ramanathaswamy', 'ramanathaswamy temple'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Madurai', aliases: ['meenakshi', 'meenakshi temple', 'meenakshi amman'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Kanchipuram', aliases: ['kanchipuram', 'kancheepuram', 'kanchi', 'kamakshi temple'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Chidambaram', aliases: ['chidambaram', 'chidambaram nataraja'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Thanjavur', aliases: ['thanjavur', 'tanjore', 'brihadeeswarar', 'brihadeeswara temple'], category: 'Religious Heritage', state: 'Tamil Nadu' },
  { label: 'Tiruvannamalai', aliases: ['tiruvannamalai', 'arunachala', 'annamalai', 'arunachaleswarar'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Kumbakonam', aliases: ['kumbakonam'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Srirangam', aliases: ['srirangam', 'ranganathaswamy'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Palani', aliases: ['palani', 'palani murugan', 'dhandayuthapani'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Tiruchendur', aliases: ['tiruchendur', 'thiruchendur'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Srivilliputhur', aliases: ['srivilliputhur', 'andal temple'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Samayapuram', aliases: ['samayapuram', 'samayapuram mariamman'], category: 'Hindu', state: 'Tamil Nadu' },
  { label: 'Nagore Dargah', aliases: ['nagore', 'nagore dargah'], category: 'Multi-faith', state: 'Tamil Nadu' },
  { label: 'Velankanni', aliases: ['velankanni', 'velankanni church', 'basilica of our lady of good health'], category: 'Christian', state: 'Tamil Nadu' },
  { label: 'San Thome Basilica', aliases: ['san thome', 'santhome', 'san thome basilica'], category: 'Christian', state: 'Tamil Nadu' },
  { label: 'St. Thomas Mount', aliases: ['st thomas mount', 'parangimalai'], category: 'Christian', state: 'Tamil Nadu' },
  { label: 'National Shrine of Our Lady of Ransom', aliases: ['our lady of ransom', 'kanyakumari shrine'], category: 'Christian', state: 'Tamil Nadu' },

  /* ── Hindu — Andhra Pradesh & Telangana ── */
  { label: 'Tirupati', aliases: ['tirumala', 'tirumala tirupati', 'tirupati balaji', 'venkateswara', 'govinda'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Srisailam', aliases: ['srisailam', 'srisailam mallikarjuna'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Vijayawada', aliases: ['kanaka durga', 'kanakadurga'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Simhachalam', aliases: ['simhachalam', 'simhachalam narasimha'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Srikalahasti', aliases: ['srikalahasti', 'kalahasti', 'srikalahasti temple'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Ahobilam', aliases: ['ahobilam', 'ahobilam narasimha'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Mangalagiri', aliases: ['mangalagiri', 'panakala narasimha'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Lepakshi', aliases: ['lepakshi', 'veerabhadra temple'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Annavaram', aliases: ['annavaram', 'annavaram satyanarayana'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Draksharamam', aliases: ['draksharamam', 'draksharama'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Dwaraka Tirumala', aliases: ['dwaraka tirumala', 'chinna tirupati'], category: 'Hindu', state: 'Andhra Pradesh' },
  { label: 'Hyderabad', aliases: ['birla mandir', 'chilkur balaji', 'chilkur'], category: 'Multi-faith', state: 'Telangana' },
  { label: 'Yadadri', aliases: ['yadadri', 'yadagirigutta', 'yadagiri gutta'], category: 'Hindu', state: 'Telangana' },
  { label: 'Bhadrachalam', aliases: ['bhadrachalam', 'bhadrachala rama'], category: 'Hindu', state: 'Telangana' },
  { label: 'Vemulawada', aliases: ['vemulawada', 'raja rajeshwara'], category: 'Hindu', state: 'Telangana' },
  { label: 'Basara', aliases: ['basara', 'basar', 'gnana saraswati'], category: 'Hindu', state: 'Telangana' },
  { label: 'Keesaragutta', aliases: ['keesaragutta'], category: 'Hindu', state: 'Telangana' },

  /* ── Hindu — Odisha, West Bengal, Bihar, Jharkhand ── */
  { label: 'Puri', aliases: ['jagannath', 'jagannath temple', 'shree jagannath'], category: 'Hindu', state: 'Odisha' },
  { label: 'Konark', aliases: ['sun temple', 'konark temple'], category: 'Religious Heritage', state: 'Odisha' },
  { label: 'Bhubaneswar', aliases: ['lingaraj', 'lingaraj temple', 'mukteshwar', 'mukteshwar temple'], category: 'Hindu', state: 'Odisha' },
  { label: 'Cuttack', aliases: ['chandi temple', 'cuttack chandi'], category: 'Hindu', state: 'Odisha' },
  { label: 'Taratarini', aliases: ['taratarini', 'tara tarini'], category: 'Hindu', state: 'Odisha' },
  { label: 'Maa Samaleswari', aliases: ['samaleswari', 'sambalpur samaleswari'], category: 'Hindu', state: 'Odisha' },
  { label: 'Kolkata', aliases: ['kalighat', 'kalighat temple', 'dakshineswar', 'dakshineswar kali temple', 'belur math'], category: 'Multi-faith', state: 'West Bengal' },
  { label: 'Tarapith', aliases: ['tarapith', 'tarapith temple'], category: 'Hindu', state: 'West Bengal' },
  { label: 'Mayapur', aliases: ['mayapur', 'iskcon mayapur', 'mayapur iskcon'], category: 'Hindu', state: 'West Bengal' },
  { label: 'Gangasagar', aliases: ['gangasagar', 'sagardwip', 'ganga sagar'], category: 'Hindu', state: 'West Bengal' },
  { label: 'Bishnupur', aliases: ['bishnupur', 'bishnupur temples'], category: 'Religious Heritage', state: 'West Bengal' },
  { label: 'Gaya', aliases: ['gaya', 'vishnupad', 'vishnupad temple'], category: 'Hindu', state: 'Bihar' },
  { label: 'Bodh Gaya', aliases: ['bodh gaya', 'bodhgaya', 'mahabodhi', 'mahabodhi temple'], category: 'Buddhist', state: 'Bihar' },
  { label: 'Rajgir', aliases: ['rajgir', 'rajgriha', 'gridhakuta'], category: 'Multi-faith', state: 'Bihar' },
  { label: 'Nalanda', aliases: ['nalanda', 'nalanda ruins'], category: 'Buddhist', state: 'Bihar' },
  { label: 'Vaishali', aliases: ['vaishali', 'vaishali stupa'], category: 'Multi-faith', state: 'Bihar' },
  { label: 'Pawapuri', aliases: ['pawapuri', 'pavapuri'], category: 'Jain', state: 'Bihar' },
  { label: 'Sankissa', aliases: ['sankissa', 'sankassa', 'sankisa'], category: 'Buddhist', state: 'Uttar Pradesh' },
  { label: 'Sarnath', aliases: ['sarnath', 'sarnath stupa', 'dhamek stupa'], category: 'Buddhist', state: 'Uttar Pradesh' },
  { label: 'Kushinagar', aliases: ['kushinagar', 'kushinara'], category: 'Buddhist', state: 'Uttar Pradesh' },
  { label: 'Patna', aliases: ['patna sahib', 'takht sri patna sahib', 'harmandir sahib patna'], category: 'Multi-faith', state: 'Bihar' },
  { label: 'Deoghar', aliases: ['deoghar', 'baidyanath', 'baidyanath dham', 'baidyanath jyotirlinga', 'baba baidyanath'], category: 'Hindu', state: 'Jharkhand' },
  { label: 'Basukinath', aliases: ['basukinath'], category: 'Hindu', state: 'Jharkhand' },
  { label: 'Shikharji', aliases: ['shikharji', 'parasnath', 'sammed shikhar'], category: 'Jain', state: 'Jharkhand' },
  { label: 'Rajrappa', aliases: ['rajrappa', 'chhinnamasta', 'chinnamasta temple'], category: 'Hindu', state: 'Jharkhand' },

  /* ── Hindu / Buddhist / Jain — MP, Chhattisgarh, Punjab, Haryana, HP ── */
  { label: 'Ujjain', aliases: ['ujjain', 'mahakaleshwar', 'mahakal', 'mahakaleshwar jyotirlinga', 'kal bhairav'], category: 'Hindu', state: 'Madhya Pradesh' },
  { label: 'Omkareshwar', aliases: ['omkareshwar', 'omkareshwar jyotirlinga'], category: 'Hindu', state: 'Madhya Pradesh' },
  { label: 'Maheshwar', aliases: ['maheshwar'], category: 'Hindu', state: 'Madhya Pradesh' },
  { label: 'Orchha', aliases: ['orchha', 'ram raja temple'], category: 'Hindu', state: 'Madhya Pradesh' },
  { label: 'Maihar', aliases: ['maihar', 'sharda devi', 'sharada devi maihar'], category: 'Hindu', state: 'Madhya Pradesh' },
  { label: 'Amarkantak', aliases: ['amarkantak', 'amarkantaka'], category: 'Hindu', state: 'Madhya Pradesh' },
  { label: 'Sanchi', aliases: ['sanchi stupa', 'sanchi'], category: 'Buddhist', state: 'Madhya Pradesh' },
  { label: 'Khajuraho', aliases: ['khajuraho temples', 'kandariya mahadev'], category: 'Religious Heritage', state: 'Madhya Pradesh' },
  { label: 'Sonagiri', aliases: ['sonagiri', 'sonagiri jain'], category: 'Jain', state: 'Madhya Pradesh' },
  { label: 'Kundalpur', aliases: ['kundalpur', 'kundalpur jain'], category: 'Jain', state: 'Madhya Pradesh' },
  { label: 'Muktagiri', aliases: ['muktagiri', 'mendhagiri'], category: 'Jain', state: 'Madhya Pradesh / Maharashtra' },
  { label: 'Hastinapur', aliases: ['hastinapur', 'hastinapur jain'], category: 'Jain', state: 'Uttar Pradesh' },
  { label: 'Champapuri', aliases: ['champapuri', 'champapur'], category: 'Jain', state: 'Bihar' },
  { label: 'Dongargarh', aliases: ['dongargarh', 'bambleshwari', 'maa bambleshwari'], category: 'Hindu', state: 'Chhattisgarh' },
  { label: 'Rajim', aliases: ['rajim', 'kuleshwar mahadev'], category: 'Hindu', state: 'Chhattisgarh' },
  { label: 'Danteshwari Temple', aliases: ['danteshwari', 'danteshwari temple', 'dantewada'], category: 'Hindu', state: 'Chhattisgarh' },
  { label: 'Bhoramdeo', aliases: ['bhoramdeo', 'bhoramdeo temple'], category: 'Religious Heritage', state: 'Chhattisgarh' },
  { label: 'Amritsar', aliases: ['golden temple', 'harmandir sahib', 'sri harmandir sahib', 'akal takht', 'darbar sahib', 'golden temple amritsar'], category: 'Sikh', state: 'Punjab' },
  { label: 'Anandpur Sahib', aliases: ['anandpur sahib', 'anandpur', 'kesgarh sahib', 'takht sri kesgarh sahib'], category: 'Sikh', state: 'Punjab' },
  { label: 'Tarn Taran Sahib', aliases: ['tarn taran', 'tarn taran sahib'], category: 'Sikh', state: 'Punjab' },
  { label: 'Goindwal Sahib', aliases: ['goindwal', 'goindwal sahib'], category: 'Sikh', state: 'Punjab' },
  { label: 'Sultanpur Lodhi', aliases: ['sultanpur lodhi'], category: 'Sikh', state: 'Punjab' },
  { label: 'Fatehgarh Sahib', aliases: ['fatehgarh sahib'], category: 'Sikh', state: 'Punjab' },
  { label: 'Dera Baba Nanak', aliases: ['dera baba nanak'], category: 'Sikh', state: 'Punjab' },
  { label: 'Talwandi Sabo', aliases: ['talwandi sabo', 'damdama sahib', 'takht sri damdama sahib'], category: 'Sikh', state: 'Punjab' },
  { label: 'Kartarpur Sahib Corridor', aliases: ['kartarpur', 'kartarpur sahib', 'kartarpur corridor'], category: 'Sikh', state: 'Pakistan (Kartarpur Corridor — registration required)' },
  { label: 'Durgiana Temple', aliases: ['durgiana', 'durgiana temple'], category: 'Hindu', state: 'Punjab' },
  { label: 'Patiala', aliases: ['patiala'], category: 'Religious Heritage', state: 'Punjab' },
  { label: 'Kurukshetra', aliases: ['kurukshetra', 'brahma sarovar'], category: 'Hindu', state: 'Haryana' },
  { label: 'Jyotisar', aliases: ['jyotisar'], category: 'Hindu', state: 'Haryana' },
  { label: 'Mata Mansa Devi', aliases: ['mata mansa devi', 'mansa devi', 'panchkula mansa devi'], category: 'Hindu', state: 'Haryana' },
  { label: 'Sheetla Mata', aliases: ['sheetla mata', 'sheela mata'], category: 'Hindu', state: 'Haryana' },
  { label: 'Manikaran', aliases: ['manikaran', 'manikaran sahib'], category: 'Multi-faith', state: 'Himachal Pradesh' },
  { label: 'Jwala Ji', aliases: ['jwala ji', 'jwalaji', 'jwalamukhi'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Chintpurni', aliases: ['chintpurni', 'chintpurni devi'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Naina Devi', aliases: ['naina devi'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Chamunda Devi', aliases: ['chamunda devi', 'chamunda temple'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Brajeshwari Devi', aliases: ['brajeshwari', 'brajeshwari devi', 'kangra brajeshwari'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Baijnath', aliases: ['baijnath', 'baijnath temple'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Hidimba Devi Temple', aliases: ['hidimba', 'hidimba devi temple'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Bhimakali Temple', aliases: ['bhimakali', 'sarahan bhimakali'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Kinnaur Kailash', aliases: ['kinnaur kailash', 'kinner kailash'], category: 'Hindu', state: 'Himachal Pradesh' },
  { label: 'Paonta Sahib', aliases: ['paonta sahib'], category: 'Sikh', state: 'Himachal Pradesh' },
  { label: 'Hemkund Sahib', aliases: ['hemkund sahib', 'hemkund', 'hemkunt sahib'], category: 'Sikh', state: 'Uttarakhand' },

  /* ── Hindu / Buddhist / Islamic — Sikkim, Assam, Arunachal & the Northeast ── */
  { label: 'Gangtok', aliases: ['tashiding monastery'], category: 'Multi-faith', state: 'Sikkim' },
  { label: 'Rumtek Monastery', aliases: ['rumtek', 'rumtek monastery'], category: 'Buddhist', state: 'Sikkim' },
  { label: 'Pemayangtse Monastery', aliases: ['pemayangtse', 'pemayangtse monastery'], category: 'Buddhist', state: 'Sikkim' },
  { label: 'Ravangla', aliases: ['ravangla', 'buddha park ravangla'], category: 'Buddhist', state: 'Sikkim' },
  { label: 'Guwahati', aliases: ['kamakhya', 'kamakhya temple', 'umananda', 'umananda temple', 'hajo', 'hayagriva madhava'], category: 'Multi-faith', state: 'Assam' },
  { label: 'Majuli', aliases: ['majuli', 'majuli satra', 'kamalabari satra'], category: 'Hindu', state: 'Assam' },
  { label: 'Sivasagar', aliases: ['sivasagar', 'sibsagar', 'shiva dol'], category: 'Religious Heritage', state: 'Assam' },
  { label: 'Tawang', aliases: ['tawang monastery', 'tawang gompa'], category: 'Buddhist', state: 'Arunachal Pradesh' },
  { label: 'Parshuram Kund', aliases: ['parshuram kund', 'parashuram kund'], category: 'Hindu', state: 'Arunachal Pradesh' },
  { label: 'Malinithan', aliases: ['malinithan'], category: 'Religious Heritage', state: 'Arunachal Pradesh' },
  { label: 'Bomdila', aliases: ['bomdila', 'bomdila monastery'], category: 'Buddhist', state: 'Arunachal Pradesh' },
  { label: 'Tripura Sundari Temple', aliases: ['tripura sundari', 'matabari', 'tripura sundari temple'], category: 'Hindu', state: 'Tripura' },
  { label: 'Unakoti', aliases: ['unakoti'], category: 'Religious Heritage', state: 'Tripura' },
  { label: 'Nartiang Durga Temple', aliases: ['nartiang', 'nartiang durga temple'], category: 'Hindu', state: 'Meghalaya' },
  { label: 'Shillong', aliases: ['shillong cathedral', 'mary help of christians'], category: 'Christian', state: 'Meghalaya' },
  { label: 'Tuensang', aliases: ['tuensang'], category: 'Christian', state: 'Nagaland' },
  { label: 'Aizawl', aliases: ['aizawl'], category: 'Christian', state: 'Mizoram' },

  /* ── Hindu / Christian / Islamic — Kerala ── */
  { label: 'Sabarimala', aliases: ['sabarimala', 'sabarimala temple', 'ayyappa', 'ayyappan'], category: 'Hindu', state: 'Kerala' },
  { label: 'Guruvayur', aliases: ['guruvayur', 'guruvayoor', 'guruvayur temple', 'guruvayoorappan'], category: 'Hindu', state: 'Kerala' },
  { label: 'Padmanabhaswamy Temple', aliases: ['padmanabhaswamy', 'padmanabhaswamy temple', 'ananthapadmanabha'], category: 'Hindu', state: 'Kerala' },
  { label: 'Attukal Bhagavathy Temple', aliases: ['attukal', 'attukal bhagavathy'], category: 'Hindu', state: 'Kerala' },
  { label: 'Chottanikkara', aliases: ['chottanikkara', 'chottanikkara bhagavathy'], category: 'Hindu', state: 'Kerala' },
  { label: 'Vaikom', aliases: ['vaikom', 'vaikom mahadeva'], category: 'Hindu', state: 'Kerala' },
  { label: 'Vadakkunnathan Temple', aliases: ['vadakkunnathan', 'thrissur vadakkunnathan'], category: 'Hindu', state: 'Kerala' },
  { label: 'Ettumanoor', aliases: ['ettumanoor', 'ettumanoor mahadeva'], category: 'Hindu', state: 'Kerala' },
  { label: 'Ambalapuzha', aliases: ['ambalapuzha', 'ambalapuzha sree krishna'], category: 'Hindu', state: 'Kerala' },
  { label: 'Thriprayar', aliases: ['thriprayar', 'thriprayar sree rama'], category: 'Hindu', state: 'Kerala' },
  { label: 'Kalady', aliases: ['kalady', 'adi shankara'], category: 'Hindu', state: 'Kerala' },
  { label: 'Cheraman Juma Mosque', aliases: ['cheraman', 'cheraman juma masjid', 'kodungallur mosque'], category: 'Islam', state: 'Kerala' },
  { label: 'Erumeli', aliases: ['erumeli', 'erumely'], category: 'Multi-faith', state: 'Kerala' },

  /* ── Islamic shrines & mosques ── */
  { label: 'Haji Ali Dargah', aliases: ['haji ali', 'haji ali dargah'], category: 'Islam', state: 'Maharashtra' },
  { label: 'Mahim Dargah', aliases: ['mahim dargah', 'makhdoom ali mahimi', 'makhdoom shah baba'], category: 'Islam', state: 'Maharashtra' },
  { label: 'Nizamuddin Dargah', aliases: ['nizamuddin', 'nizamuddin dargah', 'hazrat nizamuddin', 'dargah nizamuddin'], category: 'Islam', state: 'Delhi' },
  { label: 'Jama Masjid', aliases: ['jama masjid', 'jama masjid delhi'], category: 'Islam', state: 'Delhi' },
  { label: 'Fatehpuri Masjid', aliases: ['fatehpuri masjid', 'fatehpuri'], category: 'Islam', state: 'Delhi' },
  { label: 'Dargah of Salim Chishti', aliases: ['salim chishti', 'dargah salim chishti', 'fatehpur sikri'], category: 'Multi-faith', state: 'Uttar Pradesh' },
  { label: 'Hazratbal Shrine', aliases: ['hazratbal', 'hazratbal shrine', 'hazratbal dargah'], category: 'Islam', state: 'Jammu & Kashmir' },
  { label: 'Khanqah-e-Moula', aliases: ['khanqah e moula', 'khanqah moula'], category: 'Islam', state: 'Jammu & Kashmir' },
  { label: 'Sarkhej Roza', aliases: ['sarkhej roza', 'sarkhej'], category: 'Islam', state: 'Gujarat' },
  { label: 'Dargah of Shah Alam', aliases: ['shah alam dargah', 'shah e alam'], category: 'Islam', state: 'Gujarat' },
  { label: 'Khwaja Bande Nawaz Dargah', aliases: ['bande nawaz', 'khwaja bande nawaz', 'gulbarga dargah'], category: 'Islam', state: 'Karnataka' },
  { label: 'Bidar', aliases: ['bidar', 'bidar heritage'], category: 'Religious Heritage', state: 'Karnataka' },
  { label: 'Bibi Ka Maqbara', aliases: ['bibi ka maqbara'], category: 'Religious Heritage', state: 'Maharashtra' },
  { label: 'Nagapattinam', aliases: ['nagapattinam', 'nagore mosque'], category: 'Multi-faith', state: 'Tamil Nadu' },

  /* ── Buddhist monasteries & sites ── */
  { label: 'Hemis Monastery', aliases: ['hemis', 'hemis monastery'], category: 'Buddhist', state: 'Ladakh' },
  { label: 'Thiksey Monastery', aliases: ['thiksey', 'thiksey monastery', 'thikse'], category: 'Buddhist', state: 'Ladakh' },
  { label: 'Diskit Monastery', aliases: ['diskit', 'diskit monastery'], category: 'Buddhist', state: 'Ladakh' },
  { label: 'Lamayuru Monastery', aliases: ['lamayuru', 'lamayuru monastery'], category: 'Buddhist', state: 'Ladakh' },
  { label: 'Key Monastery', aliases: ['key monastery', 'ki monastery', 'kaza monastery'], category: 'Buddhist', state: 'Himachal Pradesh' },
  { label: 'Dhankar Monastery', aliases: ['dhankar', 'dhankar monastery'], category: 'Buddhist', state: 'Himachal Pradesh' },
  { label: 'Dharamshala', aliases: ['mcleod ganj', 'tsuglagkhang', 'dalai lama temple'], category: 'Buddhist', state: 'Himachal Pradesh' },

  /* ── Jain pilgrimage sites ── */
  { label: 'Kumbhoj', aliases: ['kumbhoj', 'bahubali kumbhoj'], category: 'Jain', state: 'Maharashtra' },
  { label: 'Mangi-Tungi', aliases: ['mangi tungi', 'mangi', 'tungi'], category: 'Jain', state: 'Maharashtra' },

  /* ── Christian pilgrimage & churches ── */
  { label: 'Mount Mary Basilica', aliases: ['mount mary', 'mount mary basilica', 'basilica of our lady of the mount'], category: 'Christian', state: 'Maharashtra' },
  { label: 'Malayattoor Church', aliases: ['malayattoor', 'malayattoor church'], category: 'Christian', state: 'Kerala' },
  { label: 'Arthunkal Basilica', aliases: ['arthunkal', 'arthunkal church'], category: 'Christian', state: 'Kerala' },
  { label: 'Edathua Church', aliases: ['edathua', 'edathua church'], category: 'Christian', state: 'Kerala' },
  { label: 'Vallarpadam Basilica', aliases: ['vallarpadam', 'vallarpadam basilica'], category: 'Christian', state: 'Kerala' },
  { label: 'Basilica of Our Lady of Dolours', aliases: ['our lady of dolours', 'dolours basilica'], category: 'Christian', state: 'Kerala' },
  { label: 'Santa Cruz Basilica', aliases: ['santa cruz basilica', 'santa cruz cathedral'], category: 'Christian', state: 'Kerala' },
  { label: 'St. Mary\u2019s Forane Church', aliases: ['st marys forane', 'forane church'], category: 'Christian', state: 'Kerala' },
  { label: 'Cathedral of the Sacred Heart', aliases: ['sacred heart cathedral', 'cathedral of the sacred heart'], category: 'Christian', state: 'Delhi' },

  /* ── Bah\u00e1\u02bc\u00ed ── */
  { label: 'Lotus Temple', aliases: ['lotus temple', 'bahai temple', 'bahai house of worship'], category: 'Bah\u00e1\u02bc\u00ed', state: 'Delhi' },
];

/** Split a display name into matchable fragments (comma/paren aware). */
function fragmentsForDisplayName(display: string): string[] {
  const out = new Set<string>();
  const cleaned = display.trim();
  if (!cleaned) return [];
  out.add(cleaned);
  for (const part of cleaned.split(/[,&]/)) {
    const p = part.trim();
    if (p) out.add(p);
  }
  const paren = cleaned.match(/^([^(]+)\(([^)]+)\)/);
  if (paren) {
    const before = paren[1].trim();
    const inside = paren[2].trim();
    if (before) out.add(before);
    for (const alt of inside.split(/[/,&]|\bor\b/i)) {
      const a = alt.trim();
      if (a) out.add(a);
    }
  }
  return [...out];
}

function canonicalForGlobeName(name: string): string {
  const t = name.trim();
  if (!t) return t;
  if (t.includes('(')) return t.split('(')[0].trim();
  return t;
}

function buildCatalog(): CatalogPlace[] {
  const byLabel = new Map<string, CatalogPlace>();
  const addAlias = (
    label: string,
    aliasRaw: string,
    source: CatalogPlace['source'],
    meta?: { category?: string; state?: string },
  ) => {
    const alias = normalizePlaceText(aliasRaw);
    if (!alias) return;
    const key = label.toLowerCase();
    let entry = byLabel.get(key);
    if (!entry) {
      entry = { label, aliases: [], source };
      // Category/state are descriptive metadata: recorded on first creation
      // only, so an existing canonical entry (city/spot) keeps its identity.
      if (meta?.category) entry.category = meta.category;
      if (meta?.state) entry.state = meta.state;
      byLabel.set(key, entry);
    }
    if (!entry.aliases.includes(alias)) entry.aliases.push(alias);
  };
  for (const d of DESTINATIONS) {
    const canonical = canonicalForGlobeName(d.name);
    for (const frag of fragmentsForDisplayName(canonical)) addAlias(canonical, frag, 'globe');
    addAlias(canonical, canonical, 'globe');
    if (d.city) {
      for (const frag of d.city.split('/')) {
        const c = frag.trim();
        if (c && normalizePlaceText(c) !== normalizePlaceText(canonical)) addAlias(canonical, c, 'globe');
      }
    }
    if (d.state) addAlias(d.state.trim(), d.state.trim(), 'globe');
  }
  for (const c of curatedDestinations) {
    const name = (c.name ?? '').trim();
    if (!name) continue;
    const primary = name.split(',')[0].trim() || name;
    for (const frag of fragmentsForDisplayName(name)) {
      if (normalizePlaceText(frag) === normalizePlaceText(primary) || frag.includes('(')) {
        addAlias(primary, frag, 'curated');
      }
    }
    addAlias(primary, primary, 'curated');
  }
  for (const entry of knownDestinations) addAlias(entry.label, entry.label, 'legacy');
  for (const state of INDIAN_STATES_AND_UTS) {
    addAlias(state.label, state.label, 'state');
    for (const alias of state.aliases ?? []) addAlias(state.label, alias, 'state');
  }
  for (const city of MAJOR_INDIAN_CITIES) {
    addAlias(city.label, city.label, 'city');
    for (const alias of city.aliases ?? []) addAlias(city.label, alias, 'city');
  }
  for (const spot of FAMOUS_TOURIST_SPOTS) {
    addAlias(spot.label, spot.label, 'spot');
    for (const alias of spot.aliases ?? []) addAlias(spot.label, alias, 'spot');
  }
  // Religious/pilgrimage layer last: adds new canonical places and enriches
  // existing ones (a label already present just gains more aliases).
  for (const site of RELIGIOUS_SITES) {
    const meta = { category: site.category, state: site.state };
    addAlias(site.label, site.label, 'religious', meta);
    for (const alias of site.aliases ?? []) addAlias(site.label, alias, 'religious', meta);
    for (const keyword of site.keywords ?? []) addAlias(site.label, keyword, 'religious', meta);
  }
  const places = [...byLabel.values()];
  for (const place of places) place.aliases.sort((a, b) => b.length - a.length);
  places.sort((a, b) => {
    const la = a.aliases.reduce((m, x) => Math.max(m, x.length), 0);
    const lb = b.aliases.reduce((m, x) => Math.max(m, x.length), 0);
    return lb - la;
  });
  return places;
}

let cachedCatalog: CatalogPlace[] | null = null;

/** Full destination catalog (built once, reused by every parse). */
export function getDestinationCatalog(): CatalogPlace[] {
  if (!cachedCatalog) cachedCatalog = buildCatalog();
  return cachedCatalog;
}

export interface PlaceHit {
  place: CatalogPlace;
  alias: string;
  index: number;
  length: number;
}

/** All catalog matches in the text, with positions. */
export function findCatalogMatches(text: string): PlaceHit[] {
  const normalized = ` ${normalizePlaceText(text)} `;
  const hits: PlaceHit[] = [];
  for (const place of getDestinationCatalog()) {
    const canonical = normalizePlaceText(place.label);
    for (const alias of place.aliases) {
      if (!alias) continue;
      const needle = ` ${alias} `;
      let from = 0;
      let at = normalized.indexOf(needle, from);
      while (at !== -1) {
        // Exact-label matches ("Kashmir" → Kashmir) outrank alias matches
        // ("Kashmir" → Srinagar row / Jammu and Kashmir) so canonical short
        // names — including the backend seed names — win generically.
        const exact = alias === canonical ? 0 : 1;
        hits.push({ place, alias, index: at + exact * 0.5, length: needle.length });
        from = at + Math.max(1, alias.length);
        at = normalized.indexOf(needle, from);
      }
    }
  }
  hits.sort((a, b) => a.index - b.index || b.length - a.length);
  return hits;
}

/** Best single catalog match (earliest position, longest alias on ties). */
export function matchCatalogPlace(text: string): CatalogPlace | undefined {
  return findCatalogMatches(text)[0]?.place;
}

/** True when a fragment is a recognized origin city (catalog OR origin gazetteer). */
export function isRecognizedOriginLabel(fragment: string): boolean {
  if (matchCatalogPlace(fragment) !== undefined) return true;
  const norm = normalizePlaceText(fragment);
  return ORIGIN_CITY_FALLBACK.has(norm);
}

/** Normalized origin-city fallback set (shared with the intent parser). */
const ORIGIN_CITY_FALLBACK = new Set(
  MAJOR_INDIAN_CITIES.flatMap((c) => [c.label, ...(c.aliases ?? [])]).map((c) => normalizePlaceText(c)),
);
