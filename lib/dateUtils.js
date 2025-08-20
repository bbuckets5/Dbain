import { toDate, format } from 'date-fns-tz';

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    // Check for the required event data
    if (!event || !event.eventDate || !event.eventTime) {
        return {
            fullDate: 'N/A',
            time: 'N/A',
            shortDate: 'N/A',
        };
    }

    try {
        // Get the date part 'YYYY-MM-DD' from the Date object.
        // .toISOString() gives a UTC-based string, so we safely split off the date part.
        const datePart = event.eventDate.toISOString().split('T')[0];

        // Combine the date part with the time string (e.g., "2025-08-21T14:00")
        const dateTimeString = `${datePart}T${event.eventTime}`;

        // Parse this combined string, explicitly telling the library it represents a time in our target timezone.
        const zonedEventDate = toDate(dateTimeString, { timeZone: TIME_ZONE });
        
        // Check if the resulting date is valid
        if (isNaN(zonedEventDate.getTime())) {
            throw new Error('Invalid date created');
        }

        // Now, format the fully correct, timezone-aware Date object for display.
        const fullDate = format(zonedEventDate, 'eeee, MMMM d, yyyy', { timeZone: TIME_ZONE });
        const time = format(zonedEventDate, 'h:mm a', { timeZone: TIME_ZONE });
        const shortDate = format(zonedEventDate, 'M/d/yy', { timeZone: TIME_ZONE });

        return {
            fullDate,
            time,
            shortDate,
        };
    } catch (error) {
        console.error("Error formatting event date:", error);
        return {
            fullDate: 'Invalid Date',
            time: 'Invalid Time',
            shortDate: 'N/A',
        };
    }
}