// In lib/dateUtils.js

// This library is safe to use on the client-side.
import { format, toDate } from 'date-fns-tz';

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    if (!event || !event.eventDate || !event.eventTime) {
        return {
            fullDate: 'N/A',
            time: 'N/A',
            shortDate: 'N/A',
        };
    }

    // The date from the database is a UTC string.
    // We combine it with the original time to create a full date-time string.
    const utcDateString = `${event.eventDate.substring(0, 10)}T${event.eventTime}:00.000Z`;
    
    // Convert the UTC string to a Date object that is aware of the target timezone.
    const eventDateObj = toDate(utcDateString, { timeZone: TIME_ZONE });

    return {
        fullDate: format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone: TIME_ZONE }),
        time: format(eventDateObj, 'h:mm a', { timeZone: TIME_ZONE }),
        shortDate: format(eventDateObj, 'M/d/yy', { timeZone: TIME_ZONE }),
    };
}