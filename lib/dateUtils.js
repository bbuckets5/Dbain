// In lib/dateUtils.js

const TIME_ZONE = 'America/New_York';

export function getLocalEventDate(event) {
    if (!event || !event.eventDate) {
        return {
            fullDate: 'N/A',
            time: 'N/A',
            shortDate: 'N/A',
        };
    }

    const eventDate = new Date(event.eventDate);

    // Use JavaScript's built-in functions for reliable timezone conversion
    const time = eventDate.toLocaleTimeString('en-US', {
        timeZone: TIME_ZONE,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    });

    const shortDate = eventDate.toLocaleDateString('en-US', {
        timeZone: TIME_ZONE,
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
    });

    const fullDate = eventDate.toLocaleDateString('en-US', {
        timeZone: TIME_ZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return {
        fullDate,
        time,
        shortDate,
    };
}
