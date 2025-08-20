// In lib/dateUtils.js
import { format, toDate } from 'date-fns-tz';

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    // We only need the main eventDate field, which is the complete UTC timestamp.
    if (!event || !event.eventDate) { 
        return {
            fullDate: 'N/A',
            time: 'N/A',
            shortDate: 'N/A',
        };
    }

    // Convert the single, correct UTC timestamp from the database to our target timezone.
    const eventDateObj = toDate(event.eventDate, { timeZone: TIME_ZONE });

    return {
        fullDate: format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone: TIME_ZONE }),
        time: format(eventDateObj, 'h:mm a', { timeZone: TIME_ZONE }),
        shortDate: format(eventDateObj, 'M/d/yy', { timeZone: TIME_ZONE }),
    };
}
