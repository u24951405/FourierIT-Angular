import { DocumentListItem } from '../../../core/services/documents-api.service';

export type ExpiryState = 'expired' | 'expiring-soon' | 'scheduled';

/** The three dates in a document's life: when it was uploaded, when the copy was certified, and when it expires. */
export type CalendarEventType = 'uploaded' | 'certified' | 'expiry';

export interface CalendarEvent {
  date: string;
  type: CalendarEventType;
  expiryState?: ExpiryState;
  label: string;
  title: string;
  documentId: number;
  fileName: string;
  certified: boolean;
}

const ORDER: Record<CalendarEventType, number> = { uploaded: 0, certified: 1, expiry: 2 };

/**
 * Builds the calendar events that fall in the given month.
 * Every document has an upload date and a calculated expiry date; the certification date is shown when one was captured.
 */
export function buildDocumentCalendarEvents(
  documents: DocumentListItem[],
  monthDate: Date,
  now = new Date(),
  warningWindowDays = 30
): CalendarEvent[] {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const warningCutoff = new Date(now.getTime() + warningWindowDays * 24 * 60 * 60 * 1000);
  const events: CalendarEvent[] = [];

  const add = (doc: DocumentListItem, value: string | null | undefined, build: (date: Date) => Omit<CalendarEvent, 'date' | 'documentId' | 'fileName' | 'certified'>) => {
    const date = toLocalDay(value);
    if (!date || date < monthStart || date > monthEnd) return;
    events.push({
      ...build(new Date(value!)),
      date: toIsoDate(date),
      documentId: doc.documentId,
      fileName: doc.fileName,
      certified: doc.isCertified
    });
  };

  for (const doc of documents) {
    add(doc, doc.uploadedDate, () => ({
      type: 'uploaded',
      label: 'Uploaded',
      title: `${doc.fileName}: uploaded`
    }));

    add(doc, doc.certificationDate, () => ({
      type: 'certified',
      label: 'Certified',
      title: `${doc.fileName}: copy certified`
    }));

    add(doc, doc.expiryDate, expiry => {
      const expiryState: ExpiryState = expiry <= now
        ? 'expired'
        : expiry <= warningCutoff ? 'expiring-soon' : 'scheduled';
      const label = expiryState === 'expired' ? 'Expired' : expiryState === 'expiring-soon' ? 'Expiring' : 'Expires';
      return { type: 'expiry', expiryState, label, title: `${doc.fileName}: ${label.toLowerCase()}` };
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.type] - ORDER[b.type]);
}

function toLocalDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toIsoDate(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
