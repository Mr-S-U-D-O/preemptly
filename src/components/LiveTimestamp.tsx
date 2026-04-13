import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface LiveTimestampProps {
  date: any; // Firestore Timestamp or Date
  className?: string;
  addSuffix?: boolean;
}

export function LiveTimestamp({ date, className = '', addSuffix = true }: LiveTimestampProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!date) {
      setTimeAgo('Just now');
      return;
    }

    const getMs = () => {
      if (typeof date.toMillis === 'function') return date.toMillis();
      if (date instanceof Date) return date.getTime();
      if (typeof date === 'number') return date;
      const parsed = new Date(date).getTime();
      return isNaN(parsed) ? Date.now() : parsed;
    };

    const update = () => {
      const ms = getMs();
      setTimeAgo(formatDistanceToNow(ms, { addSuffix }));
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date, addSuffix]);

  return <span className={className}>{timeAgo}</span>;
}
