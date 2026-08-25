import { DocumentListItem } from '../../../core/services/documents-api.service';

export type ExpiryState = 'expired' | 'expiring-soon' | 'scheduled';

export interface CalendarEvent {
  date: string;
  type: 'expiring' | 'expiry' | 'update';
  expiryState?: ExpiryState;
  label: string;
  title: string;
  documentId: number;
  fileName: string;
  certified: boolean;
}

export type ExpiryCalendarEvent = CalendarEvent & {
  type: 'expiring' | 'expiry';
  expiryState: ExpiryState;
};

export function buildExpiryCalendarEvents(
  documents: DocumentListItem[],
  monthDate: Date,
  now = new Date(),
  warningWindowDays: number
): ExpiryCalendarEvent[] {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const warningCutoff = new Date(now.getTime() + warningWindowDays * 24 * 60 * 60 * 1000);

  return documents.flatMap(doc => {
    if (!doc.expiryDate) return [];

    const expiryDate = new Date(doc.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) return [];

    const eventDate = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate()
    );

    if (eventDate < monthStart || eventDate > monthEnd) return [];

    const expiryState: ExpiryState = expiryDate <= now
      ? 'expired'
      : expiryDate <= warningCutoff
        ? 'expiring-soon'
        : 'scheduled';
    const isUrgent = expiryState !== 'scheduled';
    const stateLabel = expiryState === 'expired'
      ? 'Expired'
      : expiryState === 'expiring-soon'
        ? 'Expiring'
        : 'Expiry';
    const certificationMarker = doc.isCertified ? '' : '! ';

    return [{
      date: toIsoDate(eventDate),
      type: isUrgent ? 'expiring' : 'expiry',
      expiryState,
      label: `${certificationMarker}${stateLabel}`,
      title: `${doc.fileName} (${doc.isCertified ? stateLabel : `Uncertified - ${stateLabel}`})`,
      documentId: doc.documentId,
      fileName: doc.fileName,
      certified: doc.isCertified
    }];
  });
}

function toIsoDate(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}