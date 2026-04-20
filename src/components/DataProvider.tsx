import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Scraper, Lead, SystemLog } from '../types';
import { useAuth } from './AuthProvider';

interface DataContextType {
  scrapers: Scraper[];
  leads: Lead[];
  logs: SystemLog[];
  quotaExhausted: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthorized } = useAuth();
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const quotaErrorShown = useRef(false);

  // Graceful error handler that does NOT throw (prevents crash-remount loops)
  const handleQuotaAwareError = (error: any, collection: string) => {
    const msg = error?.message || String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota')) {
      setQuotaExhausted(true);
      if (!quotaErrorShown.current) {
        quotaErrorShown.current = true;
        console.warn(`[Preemptly] Firestore daily quota exhausted. Data is cached and will resume when quota resets (midnight PT).`);
      }
      // Do NOT throw — this prevents React crash → remount → new listeners → more reads
      return;
    }
    console.error(`Firestore error on ${collection}:`, msg);
  };

  useEffect(() => {
    if (!user || !isAuthorized) return;
    // If quota is exhausted, don't set up new listeners
    if (quotaExhausted) return;

    const scrapersQuery = query(collection(db, 'scrapers'), where('userId', '==', user.uid));
    const unsubscribeScrapers = onSnapshot(scrapersQuery, (snapshot) => {
      const data: Scraper[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Scraper);
      });
      setScrapers(data);
    }, (error) => {
      handleQuotaAwareError(error, 'scrapers');
    });

    // REDUCED from 250 → 50 to cut reads by 80%
    const leadsQuery = query(
      collection(db, 'leads'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      const data: Lead[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Lead);
      });
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setLeads(data);
    }, (error) => {
      handleQuotaAwareError(error, 'leads');
    });

    // REDUCED from 250 → 50 to cut reads by 80%
    const logsQuery = query(
      collection(db, 'logs'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const data: SystemLog[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as SystemLog);
      });
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setLogs(data);
    }, (error) => {
      handleQuotaAwareError(error, 'logs');
    });

    return () => {
      unsubscribeScrapers();
      unsubscribeLeads();
      unsubscribeLogs();
    };
  }, [user, quotaExhausted]);

  return (
    <DataContext.Provider value={{ scrapers, leads, logs, quotaExhausted }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
