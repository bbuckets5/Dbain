// In lib/dateUtils.js
import { format, toDate } from 'date-fns-tz';

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    if (!event || !event.eventDate || !event.eventTime) {
        return { fullDate: 'N/A', time: 'N/A', shortDate: 'N/A' };
    }

    // ✅ FIX: Convert the Date object to a standard string before using substring.
    const dateAsString = new Date(event.eventDate).toISOString();
    const datePart = dateAsString.substring(0, 10);
    const timePart = event.eventTime;
    
    const correctDateTimeString = `${datePart}T${timePart}`;

    const eventDateObj = toDate(correctDateTimeString, { timeZone: TIME_ZONE });

    return {
        fullDate: format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone: TIME_ZONE }),
        time: format(eventDateObj, 'h:mm a', { timeZone: TIME_ZONE }),
        shortDate: format(eventDateObj, 'M/d/yy', { timeZone: TIME_ZONE }),
    };
}
