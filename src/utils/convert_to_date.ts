import { Timestamp } from 'firebase/firestore';

function convertToDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;

  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof date?.toDate === 'function') {
    try {
      return date.toDate();
    } catch (_) {}
  }

  if (date instanceof Timestamp) return date.toDate();

  if (typeof date === 'object') {
    const seconds = typeof date.seconds === 'number' ? date.seconds : typeof date._seconds === 'number' ? date._seconds : null;
    const nanoseconds = typeof date.nanoseconds === 'number' ? date.nanoseconds : typeof date._nanoseconds === 'number' ? date._nanoseconds : 0;
    if (seconds !== null) {
      return new Date(seconds * 1000 + nanoseconds / 1000000);
    }
  }

  return null;
}

export { convertToDate };
