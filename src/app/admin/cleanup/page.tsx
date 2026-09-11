'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, getDoc, doc, writeBatch, Timestamp 
} from 'firebase/firestore';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

const Icons = {
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Refresh: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  ),
  Zap: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  Loader: () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  ),
  Terminal: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
  ),
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
  ),
  Database: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
  )
};

export default function AdminCleanupPage() {
  const formatNumber = (number: number) => {
      return number.toLocaleString('en-US');
    };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");
  
  const [stats, setStats] = useState({ 
    totalRooms: 0, 
    totalUsers: 0,    
    waitingRooms: 0, 
    expiredRooms: 0, 
    activeRooms: 0,
    allTimeCreated: 2492 // Fallback default matching your current target
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'success' | 'info' | 'error' }>>([]);

  const addLog = (text: string, type: 'success' | 'info' | 'error') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ id: Math.random().toString(), time, text, type }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();
      setIsAuthenticated(authed);
      if (authed) {
        fetchRoomMetrics();
      }
    }
    verify();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    
    const result = await loginAdmin(formData);
    if (result.success) {
      setIsAuthenticated(true);
      fetchRoomMetrics();
    } else {
      setAuthError(result.error || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const fetchRoomMetrics = async () => {
    setFetching(true);
    try {
      const roomsSnap = await getDocs(collection(db, "chatRooms"));
      const usersSnap = await getDocs(collection(db, "users"));
      let waiting = 0;
      let expired = 0;
      let active = 0;
      const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

      roomsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'waiting') waiting++;
        if (data.status === 'active') active++;
        if (data.createdAt && data.createdAt < twentyFourHoursAgo) {
          expired++;
        }
      });

      // Fetch persistent all-time counter from a metadata document (e.g., `counters/system`)
      let allTime = 2492; // default fallback
      try {
        const counterDoc = await getDoc(doc(db, "counters", "system"));
        if (counterDoc.exists() && typeof counterDoc.data().totalCreated === 'number') {
          allTime = counterDoc.data().totalCreated;
        }
      } catch (e) {
        console.warn("Could not fetch remote counter, using fallback/estimate");
      }

      setStats({
        totalRooms: roomsSnap.size,
        totalUsers: usersSnap.size,
        waitingRooms: waiting,
        expiredRooms: expired,
        activeRooms: active,
        allTimeCreated: allTime,
      });
      addLog("Successfully synchronized database metrics.", "info");
    } catch (err) {
      console.error("Error fetching room metrics:", err);
      addLog("Failed to synchronize database metrics.", "error");
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (actionType: 'purge_stale' | 'delete_expired' | 'full_sweep') => {
    const confirmationText = 
      actionType === 'purge_stale' ? "Purge all stuck waiting rooms older than 2 minutes?" :
      actionType === 'delete_expired' ? "Permanently delete all chat rooms older than 24 hours?" :
      "Execute full database housekeeping sweep?";

    if (!confirm(confirmationText)) return;
    
    setLoading(actionType);
    addLog(`Initiated protocol: ${actionType.replace('_', ' ')}...`, "info");

    try {
      const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const staleWaitingLimit = Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);

      const roomsRef = collection(db, "chatRooms");
      const snapshot = await getDocs(roomsRef);

      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt;
        if (!createdAt) return;

        // Purge stuck waiting rooms (> 2 mins)
        if ((actionType === 'purge_stale' || actionType === 'full_sweep') && data.status === 'waiting' && createdAt < staleWaitingLimit) {
          batch.delete(docSnap.ref);
          count++;
        } 
        
        // Permanently delete rooms older than 24 hours
        if ((actionType === 'delete_expired' || actionType === 'full_sweep') && createdAt < twentyFourHoursAgo) {
          batch.delete(docSnap.ref);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        addLog(`Successfully processed and deleted ${count} database documents.`, "success");
      } else {
        addLog("Target collections are already clean. No modifications needed.", "info");
      }

      await fetchRoomMetrics();
    } catch (err) {
      console.error("Cleanup error:", err);
      addLog("Operation execution failed. Review browser console.", "error");
    } finally {
      setLoading(null);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center font-mono text-sm">
        Verifying security clearance...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-rose-500 uppercase tracking-widest font-bold">Encrypted Gateway</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Admin Operations</h1>
            <p className="text-xs font-mono text-neutral-400">Environment-secured authentication required.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                name="password"
                placeholder="Enter admin password..."
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-rose-500 transition-all"
                autoFocus
                required
              />
              {authError && (
                <p className="font-mono text-xs text-rose-500 mt-2">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Authenticate Session
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-wider">
              ← Return to Main App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 rounded-xl transition text-neutral-300 hover:text-white" title="Return Home">
              <Icons.ArrowLeft />
            </Link>
            <div className="font-mono text-lg font-black tracking-tighter">
              TAMBAYAN<span className="text-emerald-500">.</span> <span className="text-xs font-normal text-neutral-400 font-sans uppercase tracking-widest ml-2">Admin Console</span>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Firestore Connected
            </span>
            <button
              onClick={handleLogout}
              className="text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Destroy Session
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">System Infrastructure Control</h1>
            <p className="text-sm text-neutral-400 font-mono mt-1">Monitor room usage, execute maintenance sweeps, and purge memory leaks.</p>
          </div>
          <button
            onClick={fetchRoomMetrics}
            disabled={fetching}
            className="self-start md:self-auto px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <span className={fetching ? "animate-spin block" : "block"}><Icons.Refresh /></span>
            <span>Refresh Metrics</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-500 font-bold">All-Time Created</span>
            <div className="text-4xl font-black text-white mt-4 font-mono">{formatNumber(stats.allTimeCreated)}</div>
            <span className="text-[11px] text-neutral-500 font-mono mt-2">Cumulative historical rooms</span>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold">
              Users
            </span>

            <div className="text-4xl font-black text-purple-400 mt-4 font-mono">
              {formatNumber(stats.totalUsers)}
            </div>

            <span className="text-[11px] text-neutral-500 font-mono mt-2">
              Registered user documents
            </span>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-bold">Live Documents</span>
            <div className="text-4xl font-black text-neutral-200 mt-4 font-mono">{formatNumber(stats.totalRooms)}</div>
            <span className="text-[11px] text-neutral-500 font-mono mt-2">Active in DB right now</span>
          </div>
          
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-bold">Active Chats</span>
            <div className="text-4xl font-black text-blue-400 mt-4 font-mono">{formatNumber(stats.activeRooms)}</div>
            <span className="text-[11px] text-neutral-500 font-mono mt-2">Currently engaged rooms</span>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">Stuck Queues</span>
            <div className="text-4xl font-black text-amber-400 mt-4 font-mono">{formatNumber(stats.waitingRooms)}</div>
            <span className="text-[11px] text-neutral-500 font-mono mt-2">Waiting &gt; 2 mins</span>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-bold">Expired (24h+)</span>
            <div className="text-4xl font-black text-rose-400 mt-4 font-mono">{formatNumber(stats.expiredRooms)}</div>
            <span className="text-[11px] text-neutral-500 font-mono mt-2">Eligible for deletion</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Icons.Shield />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Maintenance Actions</h2>
                <p className="text-[11px] font-mono text-neutral-400">Trigger manual database scripts</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleAction('purge_stale')}
                disabled={loading !== null}
                className="w-full py-3.5 px-4 bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 active:scale-[0.98] text-neutral-200 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <span>Purge Stuck Queues</span>
                {loading === 'purge_stale' ? <Icons.Loader /> : <Icons.Trash />}
              </button>

              <button
                onClick={() => handleAction('delete_expired')}
                disabled={loading !== null}
                className="w-full py-3.5 px-4 bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 active:scale-[0.98] text-neutral-200 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <span>Delete Expired Chats (24h+)</span>
                {loading === 'delete_expired' ? <Icons.Loader /> : <Icons.Zap />}
              </button>

              <div className="pt-2">
                <button
                  onClick={() => handleAction('full_sweep')}
                  disabled={loading !== null}
                  className="w-full h-13 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xl shadow-emerald-950/30"
                >
                  {loading === 'full_sweep' ? (
                    <>
                      <Icons.Loader />
                      <span>Executing Sweep...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Shield />
                      <span>Run Full Housekeeping Sweep</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-800 text-neutral-300 border border-neutral-700/50">
                  <Icons.Terminal />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">System Audit Log</h2>
                  <p className="text-[11px] font-mono text-neutral-400">Live operational event tracking</p>
                </div>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-xs font-mono text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
              >
                Clear Logs
              </button>
            </div>

            <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 h-[240px] overflow-y-auto font-mono text-xs space-y-2.5">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-600">
                  No operational actions recorded yet.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 leading-relaxed">
                    <span className="text-neutral-600 shrink-0">[{log.time}]</span>
                    <span className={`break-all ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400' : 'text-neutral-300'
                    }`}>
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}