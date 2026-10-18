'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAllBooks } from '@/algorithm-core/modules/tcm/classics';
import { loadJsonPack } from '@/lib/offlinePackClient';
import { isCompatibleTcmEditionPack, mergeTcmEditionPack } from '@/lib/tcmEditionPack';

const bundled = getAllBooks();
const TcmEditions = createContext({ books: bundled, version: '内置' });
export const useTcmEditions = () => useContext(TcmEditions);

export function TcmEditionProvider({ children }: { children: ReactNode }) {
  const [catalogue, setCatalogue] = useState({ books: bundled, version: '内置' });
  useEffect(() => {
    let active = true;
    const reload = async () => {
      const pack = await loadJsonPack<unknown>('tcm-original-editions-approved');
      if (active && isCompatibleTcmEditionPack(pack, bundled)) setCatalogue({ books: mergeTcmEditionPack(bundled, pack), version: pack.version });
    };
    const onInstalled = (event: Event) => {
      if ((event as CustomEvent<{ packId?: string }>).detail?.packId === 'tcm-original-editions-approved') void reload().catch(() => {});
    };
    void reload().catch(() => {});
    window.addEventListener('offline-pack-installed', onInstalled);
    return () => { active = false; window.removeEventListener('offline-pack-installed', onInstalled); };
  }, []);
  return <TcmEditions.Provider value={catalogue}>{children}</TcmEditions.Provider>;
}
