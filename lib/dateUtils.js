// In lib/dateUtils.js
import { format } from 'date-fns-tz';

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    if (!event || !event.eventDate) {
        return {
            fullDate: 'N/A',
            time: 'N/A',
            shortDate: 'N/A',
        };
    }

    // The event.eventDate from the database is the correct UTC timestamp.
    // We just need to format it for the New York timezone.
    // The `format` function from `date-fns-tz` handles the conversion automatically.
    const eventDate = new Date(event.eventDate);

    return {
        fullDate: format(eventDate, 'EEEE, MMMM d, yyyy', { timeZone: TIME_ZONE }),
        time: format(eventDate, 'h:mm a', { timeZone: TIME_ZONE }),
        shortDate: format(eventDate, 'M/d/yy', { timeZone: TIME_ZONE }),
    };
}
