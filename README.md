# TourFlow AI - Technical Handoff & Local Development Manual

> **Enterprise AI-Powered Personalized & Dynamic Travel Planning Platform**  
> Complete Technical Documentation, Architecture Guide, and Local Setup Manual.

---

## 1. Project Overview

### What TourFlow AI Does
TourFlow AI is a dual-sided travel orchestration platform bridging individual travelers with commercial tour operators. It combines generative AI models (Google Gemini) with strict algorithmic validation to deliver hyper-tailored multi-day travel itineraries, verified real-world transport routes, live dynamic destination visuals, and automated disruption replanning.

### Problem It Solves
1. **Hallucinated Travel Logistics**: Generic LLMs often hallucinate non-existent flight routes, impossible transit durations, phantom train numbers, and invalid season-destination pairings. TourFlow AI enforces strict ground-truth validation over transport hubs, geocoordinates, and real Indian transit routes.
2. **Fragile Static Itineraries**: Conventional itineraries are static PDFs that break when landslides, weather delays, or road closures occur. TourFlow AI provides real-time impact analysis, autonomous AI candidate generation, and single-click operator replanning.
3. **Disjointed Traveler-Operator State**: Traditional travel businesses rely on fragmented spreadsheets, WhatsApp chats, and disconnected booking tools. TourFlow AI uses a unified canonical data model where Traveler and Operator interfaces operate on the exact same database records in real time.

### Current Prototype Scope & Key Differentiators
- **Featured Destinations**: Manali (Himachal Pradesh), Goa, Kerala (Munnar/Alleppey), Rajasthan (Jaipur/Udaipur), Kashmir (Srinagar/Gulmarg).
- **Dual-Portal Synchronization**: Instant bi-directional state sync between Traveler Workspace (`/`) and Operator Enterprise Suite (`/operator/dashboard`).
- **Interactive Multi-Day Mapping**: Leaflet-powered maps featuring day-by-day route paths, pinpoint markers for hotels and activities, and transit hub links.
- **Dynamic Backdrop Engine**: Responsive ambient video/image backdrops matching the destination and time of day.
- **Client-Side PDF Generation**: Vector-grade, multi-page branded travel voucher and itinerary export with jsPDF.

---

## 2. User Journeys

### A. Traveler Journey
```
[ Discover ] ──▶ [ Personalize ] ──▶ [ Plan ] ──▶ [ Explore / Compare ] ──▶ [ Price ]
      │
      ▼
   [ Book ] ──▶ [ Prepare ] ──▶ [ Operate ] ──▶ [ Assist (Concierge) ] ──▶ [ Adapt (Replan) ] ──▶ [ Complete & Review ]
```
1. **Discover**: Browse interactive destination showcases with dynamic backgrounds, seasonal highlights, weather advice, and curated tags.
2. **Personalize**: Input natural-language trip requirements (e.g. *"4-day luxury couple trip to Manali with snow adventure and boutique stay in December"*).
3. **Plan**: AI parses constraints into verified dates, budget tiers, companion types, and pace, building an exact $N$-day structured itinerary.
4. **Explore & Compare**: Review day-by-day morning, afternoon, and evening slots; swap hotels or switch transport modes (Private SUV vs. Volvo vs. Flights).
5. **Price**: Real-time cost recalculation dynamically updates per-person totals, accommodation nights, transport fares, and target budget variances.
6. **Book**: Review booking references (`TF-XXXXXX`) across hotels, transport operators, and activity providers.
7. **Prepare**: Export comprehensive PDF travel vouchers, review packing checklists, and check emergency contact lists.
8. **Operate**: Follow day-by-day schedule with live route maps and location coordinates.
9. **Assist**: Use the in-app Gemini AI Travel Concierge for immediate local advice, food recommendations, and packing tips.
10. **Adapt**: Receive immediate alert banners if a disruption occurs, reviewing proposed alternative activities or accommodations.
11. **Complete & Review**: Submit ratings and feedback to refine future recommendation scoring.
