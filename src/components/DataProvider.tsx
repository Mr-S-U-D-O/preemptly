import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, where, limit, orderBy, getDocs } from 'firebase/firestore';
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

  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    if (!user || !isAuthorized) {
      setScrapers([]);
      setLeads([]);
      setLogs([]);
      return;
    }
    // If quota is exhausted, don't set up new listeners
    if (quotaExhausted) return;

    // Scrapers: Keep onSnapshot because status changes are important for UI feedback
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

    // Leads: One-time fetch to save costs. Users can refresh to see new matches.
    const fetchLeadsAndLogs = async () => {
      // Throttle fetches: Only allow one fetch every 45 seconds to prevent
      // remount/refresh storms from burning the quota.
      const now = Date.now();
      if (now - lastFetchTime.current < 45000) return;
      lastFetchTime.current = now;

      try {
        const leadsQuery = query(
          collection(db, 'leads'), 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const leadsSnap = await getDocs(leadsQuery);
        const leadsData: Lead[] = [];
        leadsSnap.forEach((doc) => {
          leadsData.push({ id: doc.id, ...doc.data() } as Lead);
        });
        setLeads(leadsData);

        const logsQuery = query(
          collection(db, 'logs'), 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const logsSnap = await getDocs(logsQuery);
        const logsData: SystemLog[] = [];
        logsSnap.forEach((doc) => {
          logsData.push({ id: doc.id, ...doc.data() } as SystemLog);
        });
        setLogs(logsData);
      } catch (error) {
        handleQuotaAwareError(error, 'leads_or_logs_fetch');
      }
    };

    fetchLeadsAndLogs();

    return () => {
      unsubscribeScrapers();
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
