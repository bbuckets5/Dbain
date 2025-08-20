// In lib/dateUtils.js
import { format, toDate } from 'date-fns-tz';

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    if (!event || !event.eventDate || !event.eventTime) {
        return { fullDate: 'N/A', time: 'N/A', shortDate: 'N/A' };
    }

    // FIX: Reconstruct the date string using the correct date part AND the saved time string.
    // This ensures that even if the timestamp in the DB is midnight, we use the real time.
    const datePart = event.eventDate.substring(0, 10);
    const timePart = event.eventTime;
    
    const correctDateTimeString = `${datePart}T${timePart}`;

    // Convert this correct string into a timezone-aware object for formatting.
    const eventDateObj = toDate(correctDateTimeString, { timeZone: TIME_ZONE });

    return {
        fullDate: format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone: TIME_ZONE }),
        time: format(eventDateObj, 'h:mm a', { timeZone: TIME_ZONE }),
        shortDate: format(eventDateObj, 'M/d/yy', { timeZone: TIME_ZONE }),
    };
}
