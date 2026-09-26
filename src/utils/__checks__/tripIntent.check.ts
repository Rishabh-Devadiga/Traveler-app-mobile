/**
 * Node-runnable checks for trip-intent parsing (parseTripPrompt.ts).
 * Generic catalog-driven cases — no per-destination hacks.
 * Run: npm run check:intent
 */
import { parseTripPrompt } from '../parseTripPrompt';

export interface IntentCheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

type Check = () => void | string;

const checks: Array<{ name: string; run: Check }> = [];

function check(name: string, run: Check): void {
  checks.push({ name, run });
}

function eq(actual: unknown, expected: unknown, label: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

check('Andhra Pradesh prompt resolves the state destination', () => {
  const p = parseTripPrompt('Plan a trip to Andhra Pradesh');
  eq(p.destination, 'Andhra Pradesh', 'destination');
});

check('from/to splits source and destination', () => {
  const p = parseTripPrompt('I want to travel from Mumbai to Kerala');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Kerala', 'destination');
});

check('duration + leg parsing', () => {
  const p = parseTripPrompt('Plan a 6 day trip from Mumbai to Goa');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
  eq(p.durationDays, 6, 'duration');
});

check('visit phrasing with duration', () => {
  const p = parseTripPrompt('I want to visit Rajasthan for 8 days');
  eq(p.destination, 'Rajasthan', 'destination');
  eq(p.durationDays, 8, 'duration');
});

check('take-me-from phrasing', () => {
  const p = parseTripPrompt('Take me from Pune to Kashmir for 7 days');
  eq(p.origin, 'Pune', 'origin');
  eq(p.durationDays, 7, 'duration');
});

check('start date + duration derives ISO range (inclusive convention)', () => {
  const p = parseTripPrompt('I want to start my trip on 15 October 2026 and travel to Kerala for 6 days');
  eq(p.destination, 'Kerala', 'destination');
  eq(p.startDate, '2026-10-15', 'start');
  eq(p.endDate, '2026-10-20', 'end');
  eq(p.durationDays, 6, 'duration');
});

check('origin + explicit date + duration', () => {
  const p = parseTripPrompt('My trip starts from Mumbai on 10 November 2026 and I want to spend 6 days in Rajasthan');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Rajasthan', 'destination');
  eq(p.startDate, '2026-11-10', 'start');
  eq(p.endDate, '2026-11-15', 'end');
});

check('invalid destination is rejected (no silent accept)', () => {
  const p = parseTripPrompt('Plan a trip to XYZABC');
  eq(p.destination, undefined, 'destination');
  eq(p.suspectedDestination, 'XYZABC', 'suspected');
});

check('invalid source keeps a valid destination', () => {
  const p = parseTripPrompt('from XYZABC to Goa');
  eq(p.destination, 'Goa', 'destination');
  eq(p.origin, undefined, 'origin');
  eq(p.suspectedOrigin, 'XYZABC', 'suspected origin');
});

check('combo: destination + duration + travelers + budget', () => {
  const p = parseTripPrompt('Goa for 5 days for 2 people under 50000');
  eq(p.destination, 'Goa', 'destination');
  eq(p.durationDays, 5, 'duration');
  eq(p.travelers, 2, 'travelers');
  eq(p.budgetAmount, 50000, 'budget');
});

check('capitalization is irrelevant', () => {
  const p = parseTripPrompt('ANDHRA PRADESH TRIP');
  eq(p.destination, 'Andhra Pradesh', 'destination');
});

check('short natural forms resolve', () => {
  eq(parseTripPrompt('Kerala trip').destination, 'Kerala', 'Kerala trip');
  eq(parseTripPrompt('6 days in Kerala').destination, 'Kerala', '6 days');
  eq(parseTripPrompt('6 days in Kerala').durationDays, 6, '6 duration');
});

check('Goa from Mumbai splits correctly', () => {
  const p = parseTripPrompt('Goa from Mumbai for 4 days');
  eq(p.destination, 'Goa', 'destination');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.durationDays, 4, 'duration');
});

check('date range parses both ends', () => {
  const p = parseTripPrompt('from 10 October to 16 October 2026');
  eq(p.startDate, '2026-10-10', 'start');
  eq(p.endDate, '2026-10-16', 'end');
});

check('multi-destination prompt flags alternates instead of discarding', () => {
  const p = parseTripPrompt('5 days Goa and 4 days Kerala');
  eq(p.destination, 'Goa', 'primary');
  eq(JSON.stringify(p.alternateDestinations), JSON.stringify(['Kerala']), 'alternates');
});

check('hinglish forms resolve', () => {
  eq(parseTripPrompt('Mumbai se Kerala').destination, 'Kerala', 'se destination');
  eq(parseTripPrompt('Mumbai se Kerala').origin, 'Mumbai', 'se origin');
  eq(parseTripPrompt('Kerala jaana hai').destination, 'Kerala', 'jaana hai');
});

check('from Mumbai to Goa', () => {
  const p = parseTripPrompt('from Mumbai to Goa');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
});

check('travel from Pune to Kerala', () => {
  const p = parseTripPrompt('travel from Pune to Kerala');
  eq(p.origin, 'Pune', 'origin');
  eq(p.destination, 'Kerala', 'destination');
});

check('going from Delhi to Rajasthan', () => {
  const p = parseTripPrompt('going from Delhi to Rajasthan');
  eq(p.origin, 'Delhi', 'origin');
  eq(p.destination, 'Rajasthan', 'destination');
});

check('start from Mumbai and go to Manali', () => {
  const p = parseTripPrompt('start from Mumbai and go to Manali');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Manali', 'destination');
});

check('travelling from Bengaluru to Kashmir', () => {
  const p = parseTripPrompt('travelling from Bengaluru to Kashmir');
  eq(p.origin, 'Bengaluru', 'origin');
  eq(p.destination, 'Kashmir', 'destination');
});

check('from Hyderabad to Goa for 5 days', () => {
  const p = parseTripPrompt('from Hyderabad to Goa for 5 days');
  eq(p.origin, 'Hyderabad', 'origin');
  eq(p.destination, 'Goa', 'destination');
  eq(p.durationDays, 5, 'duration');
});

check('starting from Bengaluru to Kashmir', () => {
  const p = parseTripPrompt('starting from Bengaluru to Kashmir');
  eq(p.origin, 'Bengaluru', 'origin');
  eq(p.destination, 'Kashmir', 'destination');
});

check('Mumbai se Goa jaana hai', () => {
  const p = parseTripPrompt('Mumbai se Goa jaana hai');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
});

check('from Hyderabad to Ooty', () => {
  const p = parseTripPrompt('from Hyderabad to Ooty');
  eq(p.origin, 'Hyderabad', 'origin');
  eq(p.destination, 'Ooty', 'destination');
});

check('from Chennai to Coorg', () => {
  const p = parseTripPrompt('from Chennai to Coorg');
  eq(p.origin, 'Chennai', 'origin');
  eq(p.destination, 'Coorg', 'destination');
});

check('from Kolkata to Darjeeling', () => {
  const p = parseTripPrompt('from Kolkata to Darjeeling');
  eq(p.origin, 'Kolkata', 'origin');
  eq(p.destination, 'Darjeeling', 'destination');
});

check('from Ahmedabad to Udaipur', () => {
  const p = parseTripPrompt('from Ahmedabad to Udaipur');
  eq(p.origin, 'Ahmedabad', 'origin');
  eq(p.destination, 'Udaipur', 'destination');
});

check('alias: from Bombay to Bangalore', () => {
  const p = parseTripPrompt('from Bombay to Bangalore');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Bengaluru', 'destination');
});

check('invalid destination keeps valid source', () => {
  const p = parseTripPrompt('from Mumbai to ABCXYZ');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, undefined, 'destination');
  eq(p.suspectedDestination, 'ABCXYZ', 'suspected');
});

check('FROM MUMBAI TO GOA case-insensitive', () => {
  const p = parseTripPrompt('FROM MUMBAI TO GOA');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
});

check('multi-word: from New Delhi to Andhra Pradesh', () => {
  const p = parseTripPrompt('from New Delhi to Andhra Pradesh');
  eq(p.origin, 'Delhi', 'origin');
  eq(p.destination, 'Andhra Pradesh', 'destination');
});

check('full combo with date', () => {
  const p = parseTripPrompt('from Mumbai to Goa starting 15 October 2026 for 6 days');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
  eq(p.startDate, '2026-10-15', 'start');
  eq(p.endDate, '2026-10-20', 'end');
  eq(p.durationDays, 6, 'duration');
});

check('budget+travelers combo with leg', () => {
  const p = parseTripPrompt('from Mumbai to Goa for 5 days for 2 people under 50000');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
  eq(p.durationDays, 5, 'duration');
  eq(p.travelers, 2, 'travelers');
  eq(p.budgetAmount, 50000, 'budget');
});

check('ambiguous Mumbai Goa trip invents no source', () => {
  const p = parseTripPrompt('Mumbai Goa trip');
  eq(p.origin, undefined, 'origin');
});

/* ---- Standalone FROM / TO cue regressions (explicit grammar priority) ---- */

check('standalone from Nashik → source only', () => {
  const p = parseTripPrompt('from Nashik');
  eq(p.origin, 'Nashik', 'origin');
  eq(p.destination, undefined, 'destination stays empty');
  // No false validation banners: neither side is flagged as unrecognized.
  eq(p.suspectedDestination, undefined, 'no suspected destination');
  eq(p.suspectedOrigin, undefined, 'no suspected origin');
});

check('standalone from Mumbai → source only', () => {
  const p = parseTripPrompt('from Mumbai');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, undefined, 'destination stays empty');
});

check('standalone starting from Pune → source only', () => {
  const p = parseTripPrompt('starting from Pune');
  eq(p.origin, 'Pune', 'origin');
  eq(p.destination, undefined, 'destination stays empty');
});

check('standalone start from Mumbai → source only', () => {
  const p = parseTripPrompt('start from Mumbai');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, undefined, 'destination');
});

check('standalone leave/depart/travel from cues → source only', () => {
  eq(parseTripPrompt('leaving from Pune').origin, 'Pune', 'leaving from');
  eq(parseTripPrompt('leaving from Pune').destination, undefined, 'leaving dest');
  eq(parseTripPrompt('departing from Delhi').origin, 'Delhi', 'departing from');
  eq(parseTripPrompt('travelling from Hyderabad').origin, 'Hyderabad', 'travelling from');
  eq(parseTripPrompt('travelling from Hyderabad').destination, undefined, 'travelling dest');
});

check('standalone to Pune → destination only', () => {
  const p = parseTripPrompt('to Pune');
  eq(p.origin, undefined, 'source stays empty');
  eq(p.destination, 'Pune', 'destination');
  eq(p.suspectedDestination, undefined, 'no suspected destination');
  eq(p.suspectedOrigin, undefined, 'no suspected origin');
});

check('standalone to Goa → destination only', () => {
  const p = parseTripPrompt('to Goa');
  eq(p.origin, undefined, 'source stays empty');
  eq(p.destination, 'Goa', 'destination');
});

check('travel to Kerala → destination only', () => {
  const p = parseTripPrompt('travel to Kerala');
  eq(p.origin, undefined, 'source');
  eq(p.destination, 'Kerala', 'destination');
});

check('trip to Kashmir / visit Mumbai → destination only', () => {
  eq(parseTripPrompt('trip to Kashmir').destination, 'Kashmir', 'trip to');
  eq(parseTripPrompt('trip to Kashmir').origin, undefined, 'trip to source');
  eq(parseTripPrompt('visit Mumbai').destination, 'Mumbai', 'visit');
  eq(parseTripPrompt('visit Mumbai').origin, undefined, 'visit source');
});

check('from Nashik to Pune', () => {
  const p = parseTripPrompt('from Nashik to Pune');
  eq(p.origin, 'Nashik', 'origin');
  eq(p.destination, 'Pune', 'destination');
});

check('to Goa from Mumbai', () => {
  const p = parseTripPrompt('to Goa from Mumbai');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
});

check('to Pune from Nashik', () => {
  const p = parseTripPrompt('to Pune from Nashik');
  eq(p.origin, 'Nashik', 'origin');
  eq(p.destination, 'Pune', 'destination');
});

check('starting from Nashik and going to Pune', () => {
  const p = parseTripPrompt('starting from Nashik and going to Pune');
  eq(p.origin, 'Nashik', 'origin');
  eq(p.destination, 'Pune', 'destination');
});

check('travel from Pune to Kerala for 6 days', () => {
  const p = parseTripPrompt('travel from Pune to Kerala for 6 days');
  eq(p.origin, 'Pune', 'origin');
  eq(p.destination, 'Kerala', 'destination');
  eq(p.durationDays, 6, 'duration');
});

check('from Nashik for 5 days → source + duration, no destination', () => {
  const p = parseTripPrompt('from Nashik for 5 days');
  eq(p.origin, 'Nashik', 'origin');
  eq(p.destination, undefined, 'destination');
  eq(p.durationDays, 5, 'duration');
});

check('to Pune for 4 days → destination + duration, no source', () => {
  const p = parseTripPrompt('to Pune for 4 days');
  eq(p.origin, undefined, 'origin');
  eq(p.destination, 'Pune', 'destination');
  eq(p.durationDays, 4, 'duration');
});

check('from ABCXYZ → suspected source, no destination', () => {
  const p = parseTripPrompt('from ABCXYZ');
  eq(p.origin, undefined, 'origin');
  eq(p.destination, undefined, 'destination');
  eq(p.suspectedOrigin, 'ABCXYZ', 'suspected origin');
});

check('to ABCXYZ → suspected destination, no source', () => {
  const p = parseTripPrompt('to ABCXYZ');
  eq(p.origin, undefined, 'origin');
  eq(p.destination, undefined, 'destination');
  eq(p.suspectedDestination, 'ABCXYZ', 'suspected destination');
});

check('from ABCXYZ to Goa keeps the valid destination', () => {
  const p = parseTripPrompt('from ABCXYZ to Goa');
  eq(p.origin, undefined, 'origin');
  eq(p.destination, 'Goa', 'destination');
  eq(p.suspectedOrigin, 'ABCXYZ', 'suspected origin');
});

check('from Mumbai to ABCXYZ keeps the valid source', () => {
  const p = parseTripPrompt('from Mumbai to ABCXYZ');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, undefined, 'destination');
  eq(p.suspectedDestination, 'ABCXYZ', 'suspected destination');
});

check('Goa trip → destination only, no source', () => {
  const p = parseTripPrompt('Goa trip');
  eq(p.destination, 'Goa', 'destination');
  eq(p.origin, undefined, 'origin');
});

check('bare place keeps standalone destination behaviour', () => {
  const p = parseTripPrompt('Nashik');
  eq(p.destination, 'Nashik', 'destination');
  eq(p.origin, undefined, 'origin');
  eq(parseTripPrompt('Goa').destination, 'Goa', 'bare Goa');
});

check('hinglish departure-only: Goa se jaana hai → source', () => {
  const p = parseTripPrompt('Goa se jaana hai');
  eq(p.origin, 'Goa', 'origin');
  eq(p.destination, undefined, 'destination not invented');
  eq(parseTripPrompt('Goa jaana hai').destination, 'Goa', 'jaana hai destination');
});

check('hinglish from X se Y keeps both sides', () => {
  const p = parseTripPrompt('from Mumbai se Goa');
  eq(p.origin, 'Mumbai', 'origin');
  eq(p.destination, 'Goa', 'destination');
});

check('destination-cue variants keep destination-only behaviour', () => {
  const weekend = parseTripPrompt('weekend trip to Goa for 2 people');
  eq(weekend.destination, 'Goa', 'weekend trip destination');
  eq(weekend.origin, undefined, 'weekend trip source');
  const budgeted = parseTripPrompt('6 days in Kerala under ₹50k');
  eq(budgeted.destination, 'Kerala', 'budgeted destination');
  eq(budgeted.origin, undefined, 'budgeted source');
  eq(budgeted.budgetAmount, 50000, 'budgeted amount');
});

/* ── Religious / pilgrimage catalog coverage (generic catalog matching) ── */

/** Destination label for a prompt (keeps the shrine assertions terse). */
function destOf(prompt: string): string | undefined {
  return parseTripPrompt(prompt).destination;
}

check('religious sites: Hindu temples and tirths resolve', () => {
  eq(destOf('plan a trip to Varanasi'), 'Varanasi', 'Varanasi');
  eq(destOf('I want to visit Tirupati'), 'Tirupati', 'Tirupati');
  eq(destOf('trip to Tirumala'), 'Tirupati', 'Tirumala alias');
  eq(destOf('trip to Vaishno Devi'), 'Vaishno Devi', 'Vaishno Devi');
  eq(destOf('trip to Mata Vaishno Devi'), 'Vaishno Devi', 'Mata Vaishno Devi');
  eq(destOf('visit Ayodhya'), 'Ayodhya', 'Ayodhya');
  eq(destOf('trip to Somnath'), 'Somnath', 'Somnath');
  eq(destOf('trip to Dwaraka'), 'Dwarka', 'Dwaraka alias');
  eq(destOf('trip to Rameswaram'), 'Rameswaram', 'Rameswaram');
  eq(destOf('trip to Jagannath Puri'), 'Puri', 'Jagannath Puri');
  eq(destOf('trip to Ujjain'), 'Ujjain', 'Ujjain');
  eq(destOf('trip to Mahakaleshwar'), 'Ujjain', 'Mahakaleshwar alias');
  eq(destOf('trip to Deoghar'), 'Deoghar', 'Deoghar');
  eq(destOf('trip to Baidyanath'), 'Deoghar', 'Baidyanath alias');
  eq(destOf('trip to Sabarimala'), 'Sabarimala', 'Sabarimala');
  eq(destOf('trip to Guruvayoor'), 'Guruvayur', 'Guruvayoor alias');
  eq(destOf('trip to Kamakhya'), 'Guwahati', 'Kamakhya');
  eq(destOf('trip to Hemkund Sahib'), 'Hemkund Sahib', 'Hemkund Sahib');
  eq(destOf('trip to Tawang Monastery'), 'Tawang', 'Tawang Monastery');
});

check('religious sites: Sikh takhts and gurdwaras resolve', () => {
  eq(destOf('take me to Golden Temple'), 'Amritsar', 'Golden Temple');
  eq(destOf('trip to Harmandir Sahib'), 'Amritsar', 'Harmandir Sahib');
  eq(destOf('trip to Anandpur Sahib'), 'Anandpur Sahib', 'Anandpur Sahib');
  eq(destOf('trip to Kesgarh Sahib'), 'Anandpur Sahib', 'Kesgarh Sahib alias');
  eq(destOf('visit Patna Sahib'), 'Patna', 'Patna Sahib');
  eq(destOf('trip to Hazur Sahib'), 'Nanded', 'Hazur Sahib');
  eq(destOf('trip to Talwandi Sabo'), 'Talwandi Sabo', 'Talwandi Sabo');
});

check('religious sites: Islamic shrines and mosques resolve', () => {
  eq(destOf('visit Ajmer Sharif'), 'Ajmer', 'Ajmer Sharif');
  eq(destOf('go to Dargah Nizamuddin'), 'Nizamuddin Dargah', 'Nizamuddin Dargah');
  eq(destOf('visit Haji Ali'), 'Haji Ali Dargah', 'Haji Ali');
  eq(destOf('trip to Jama Masjid'), 'Jama Masjid', 'Jama Masjid');
  eq(destOf('trip to Hazratbal'), 'Hazratbal Shrine', 'Hazratbal');
  eq(destOf('trip to Cheraman Juma Mosque'), 'Cheraman Juma Mosque', 'Cheraman');
});

check('religious sites: Buddhist sites and monasteries resolve', () => {
  eq(destOf('visit Bodh Gaya'), 'Bodh Gaya', 'Bodh Gaya');
  eq(destOf('trip to Mahabodhi Temple'), 'Bodh Gaya', 'Mahabodhi Temple');
  eq(destOf('trip to Sarnath'), 'Sarnath', 'Sarnath');
  eq(destOf('trip to Kushinagar'), 'Kushinagar', 'Kushinagar');
  eq(destOf('trip to Rumtek Monastery'), 'Rumtek Monastery', 'Rumtek');
  eq(destOf('trip to Namdroling Monastery'), 'Namdroling Monastery', 'Namdroling');
  eq(destOf('trip to McLeod Ganj'), 'Dharamshala', 'McLeod Ganj');
});

check('religious sites: Jain pilgrimage sites resolve', () => {
  eq(destOf('trip to Palitana'), 'Palitana', 'Palitana');
  eq(destOf('trip to Shatrunjaya'), 'Palitana', 'Shatrunjaya alias');
  eq(destOf('trip to Shikharji'), 'Shikharji', 'Shikharji');
  eq(destOf('trip to Parasnath'), 'Shikharji', 'Parasnath alias');
  eq(destOf('trip to Shravanabelagola'), 'Shravanabelagola', 'Shravanabelagola');
  eq(destOf('trip to Ranakpur Jain Temple'), 'Ranakpur Jain Temple', 'Ranakpur');
  eq(destOf('trip to Dilwara'), 'Dilwara Temples', 'Dilwara alias');
});

check('religious sites: Christian pilgrimage sites resolve', () => {
  eq(destOf('I want to visit Basilica of Bom Jesus'), 'Basilica of Bom Jesus', 'Bom Jesus');
  eq(destOf('trip to Old Goa'), 'Old Goa', 'Old Goa (not Goa)');
  eq(destOf('trip to Velankanni'), 'Velankanni', 'Velankanni');
  eq(destOf('visit Velankanni Church'), 'Velankanni', 'Velankanni Church');
  eq(destOf('trip to San Thome Basilica'), 'San Thome Basilica', 'San Thome');
  eq(destOf('trip to Mount Mary'), 'Mount Mary Basilica', 'Mount Mary');
  eq(destOf('trip to Malayattoor'), 'Malayattoor Church', 'Malayattoor');
});

check('religious sites: Parsi and Baháʼí destinations resolve', () => {
  eq(destOf('trip to Udvada'), 'Udvada', 'Udvada');
  eq(destOf('trip to Udvada Atash Behram'), 'Udvada', 'Udvada Atash Behram');
  eq(destOf('trip to Lotus Temple'), 'Lotus Temple', 'Lotus Temple');
  eq(destOf('visit Bahai Temple'), 'Lotus Temple', 'Bahai alias');
});

check('religious site + geography pair stays a single destination', () => {
  eq(destOf('trip to Amritsar and Anandpur Sahib'), 'Amritsar', 'primary destination');
  eq(destOf('Mumbai se Ajmer jaana hai'), 'Ajmer', 'Hinglish se leg destination');
});

check('source → destination grammar with religious destinations', () => {
  const cases: Array<[string, string, string]> = [
    ['from Mumbai to Shirdi', 'Mumbai', 'Shirdi'],
    ['from Nashik to Trimbakeshwar', 'Nashik', 'Trimbakeshwar'],
    ['Mumbai se Shirdi jaana hai', 'Mumbai', 'Shirdi'],
    ['Delhi se Ajmer jaana hai', 'Delhi', 'Ajmer'],
    ['from Amritsar to Anandpur Sahib', 'Amritsar', 'Anandpur Sahib'],
    ['from Patna to Bodh Gaya', 'Patna', 'Bodh Gaya'],
    ['from Chennai to Rameswaram', 'Chennai', 'Rameswaram'],
    ['from Bengaluru to Tirupati', 'Bengaluru', 'Tirupati'],
  ];
  for (const [prompt, origin, destination] of cases) {
    const p = parseTripPrompt(prompt);
    eq(p.origin, origin, `${prompt} origin`);
    eq(p.destination, destination, `${prompt} destination`);
  }
});

export function runTripIntentChecks(): IntentCheckResult[] {
  return checks.map(({ name, run }) => {
    try {
      const detail = run();
      return { name, passed: true, detail: typeof detail === 'string' ? detail : undefined };
    } catch (error) {
      return { name, passed: false, detail: error instanceof Error ? error.message : String(error) };
    }
  });
}

