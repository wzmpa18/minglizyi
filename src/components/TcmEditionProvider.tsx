'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAllBooks } from '@/algorithm-core/modules/tcm/classics';
import { retainedEditionPack, EDITION_PACKS } from '@/lib/retainedTcmEditions';
import { isCompatibleTcmEditionPack, mergeTcmEditionPack } from '@/lib/tcmEditionPack';

const bundled = getAllBooks();
const TcmEditions = createContext({ books: bundled, version: '内置' });
export const useTcmEditions = () => useContext(TcmEditions);

export function TcmEditionProvider({ children }: { children: ReactNode }) {
  const [catalogue, setCatalogue] = useState({ books: bundled, version: '内置' });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const reload = async () => {
      let books=bundled,version='内置';
      for(const id of EDITION_PACKS){
        const pack=await retainedEditionPack(id,id==='tcm-original-editions-approved'?bundled:[]);
        if(pack&&isCompatibleTcmEditionPack(pack,id==='tcm-original-editions-approved'?bundled:[])){books=mergeTcmEditionPack(books,pack);version=pack.version;}
      }
      if(active)setCatalogue({books,version});
    };
    const onInstalled = (event: Event) => {
      if (EDITION_PACKS.includes((event as CustomEvent<{ packId?: string }>).detail?.packId||'')) void reload().catch(() => {});
    };
    // Direct chapter links must select the installed edition before the reader
    // freezes its paragraph/listening text. Later updates do not interrupt it.
    void reload().catch(() => {}).finally(() => { if (active) setReady(true); });
    window.addEventListener('offline-pack-installed', onInstalled);
    return () => { active = false; window.removeEventListener('offline-pack-installed', onInstalled); };
  }, []);
  return <TcmEditions.Provider value={catalogue}>{ready ? children : <p role="status" className="p-6 text-center text-sm text-[#42604e]">正在打开本机文献…</p>}</TcmEditions.Provider>;
}
