import { jsPDF } from 'jspdf';

/**
 * Trip PDF export (Phase 3C), reusing the legacy app's proven approach
 * (jsPDF, text layout). Text-only: remote photos are never embedded, which
 * avoids CORS/tainted-canvas failures. Every line comes from real trip data
 * passed in — nothing is fabricated here.
 */

export interface TripPdfStay {
  name: string;
  location: string;
  roomType: string;
  totalPrice: string;
  nights: number;
}

export interface TripPdfStop {
  time: string;
  title: string;
  description: string;
  cost: string;
  location: string;
}

export interface TripPdfDay {
  day: number;
  title: string;
  stops: TripPdfStop[];
}

export interface TripPdfInput {
  fileSlug: string;
  title: string;
  destination: string;
  dateRange: string;
  travelersLabel: string;
  budgetLine: string;
  totalLine: string;
  costLines: Array<{ label: string; value: string }>;
  stay: TripPdfStay | null;
  stayAlternatives: string[];
  days: TripPdfDay[];
}

export interface TripPdfSourceDay {
  day: number;
  title: string;
  stops: Array<{
    time?: string;
    endTime?: string;
    title: string;
    description: string;
    costLabel?: string;
    location?: string;
  }>;
}

/** Build PDF input from real trip data. Pure — unit-testable without jsPDF. */
export function buildTripPdfInput(args: {
  title: string;
  destination: string;
  dateRange: string;
  travelersLabel: string;
  budgetLine: string;
  totalLine: string;
  costLines: Array<{ label: string; value: string }>;
  stay: TripPdfStay | null;
  stayAlternatives: string[];
  days: TripPdfSourceDay[];
}): TripPdfInput {
  return {
    fileSlug: args.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: args.title,
    destination: args.destination,
    dateRange: args.dateRange,
    travelersLabel: args.travelersLabel,
    budgetLine: args.budgetLine,
    totalLine: args.totalLine,
    costLines: args.costLines,
    stay: args.stay,
    stayAlternatives: args.stayAlternatives,
    days: args.days.map((d) => ({
      day: d.day,
      title: d.title,
      stops: d.stops.map((s) => ({
        time: [s.time, s.endTime].filter(Boolean).join(' – '),
        title: s.title,
        description: s.description,
        cost: s.costLabel ?? '',
        location: s.location ?? '',
      })),
    })),
  };
}

export function exportTripToPDF(input: TripPdfInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  const renderHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('WanderAI — Traveler itinerary', margin, 10);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - margin, 10, { align: 'right' });
  };

  const breakIfNeeded = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      renderHeader();
    }
  };

  const line = (text: string, size: number, bold: boolean, gap = 5) => {
    breakIfNeeded(gap + 2);
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(20, 20, 25);
    const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * gap;
  };

  renderHeader();
  y += 4;
  line(input.title, 20, true, 7);
  line(input.destination, 12, false);
  if (input.dateRange) line(input.dateRange, 10, false);
  line(`${input.travelersLabel} · ${input.budgetLine}`, 10, false);
  line(input.totalLine, 11, true);
  y += 2;

  line('Cost breakdown', 13, true, 6);
  for (const row of input.costLines) {
    line(`${row.label}: ${row.value}`, 10, false);
  }
  y += 2;

  line('Stay', 13, true, 6);
  if (input.stay) {
    line(`${input.stay.name} — ${input.stay.location}`, 10, true);
    line(`${input.stay.roomType} · ${input.stay.nights} night(s) · ${input.stay.totalPrice}`, 10, false);
  } else {
    line('Accommodation unavailable for this trip.', 10, false);
  }
  if (input.stayAlternatives.length > 0) {
    line(`Alternatives: ${input.stayAlternatives.join(' · ')}`, 9, false);
  }
  y += 2;

  for (const day of input.days) {
    line(`Day ${day.day}: ${day.title}`, 13, true, 6);
    for (const stop of day.stops) {
      const head = [stop.time, stop.title].filter(Boolean).join(' — ');
      line(head || '(untimed stop)', 10, true);
      if (stop.description) line(stop.description, 9, false, 4);
      const meta = [stop.location, stop.cost].filter(Boolean).join(' · ');
      if (meta) line(meta, 9, false, 4);
      y += 1;
    }
    y += 2;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 150);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  doc.save(`tourflow-trip-${input.fileSlug || 'itinerary'}.pdf`);
}
