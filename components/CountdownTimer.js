'use client';

import { useState, useEffect } from 'react';

export default function CountdownTimer({ targetDate, onExpire }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        // Run immediately
        const calculateTime = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeLeft('Expired');
                if (onExpire) onExpire();
                return;
            }

            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onExpire]);

    return (
        <span style={{ color: '#ff4444', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {timeLeft}
        </span>
    );
}
