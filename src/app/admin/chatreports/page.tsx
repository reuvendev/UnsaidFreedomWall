'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

interface ChatReportItem {
  id: string;
  roomId: string;
  reporterId: string;
  reportedUserId: string;
  reportedUserNickname?: string;
  createdAt: string;
  roomStatus?: string;
}

export default function AdminReportsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [reports, setReports] = useState<ChatReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Verify server-side authentication status on mount
  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();
      setIsAuthenticated(authed);
      if (authed) {
        fetchReports();
      } else {
        setLoading(false);
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
      setLoading(true);
      fetchReports();
    } else {
      setAuthError(result.error || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedReports: ChatReportItem[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const roomId = data.roomId;
        const reportedUserId = data.reportedUserId || "";

        let roomStatus = "unknown";
        let reportedUserNickname = "Unknown";

        if (roomId) {
          const roomRef = doc(db, "chatRooms", roomId);
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            roomStatus = roomData.status || "active";

            // Attempt to resolve nickname from common room data schemas (adjust keys if yours differ)
            if (reportedUserId) {
              if (roomData.nicknames && roomData.nicknames[reportedUserId]) {
                reportedUserNickname = roomData.nicknames[reportedUserId];
              } else if (roomData.participantsData && roomData.participantsData[reportedUserId]?.nickname) {
                reportedUserNickname = roomData.participantsData[reportedUserId].nickname;
              } else if (roomData.users && Array.isArray(roomData.users)) {
                const foundUser = roomData.users.find((u: any) => u.uid === reportedUserId || u.id === reportedUserId);
                if (foundUser?.nickname) reportedUserNickname = foundUser.nickname;
              }
            }
          }
        }

        fetchedReports.push({
          id: docSnap.id,
          roomId: roomId || "",
          reporterId: data.reporterId || "Anonymous",
          reportedUserId,
          reportedUserNickname,
          createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : "Unknown",
          roomStatus,
        });
      }

      setReports(fetchedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Action 1: Globally Ban User and Clear Report
  const handleGlobalBan = async (report: ChatReportItem) => {
    if (!report.reportedUserId) {
      alert("Invalid reported user ID.");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to globally ban user: ${report.reportedUserNickname} (${report.reportedUserId})? This will permanently block them from entering the queue.`);
    if (!confirmed) return;

    try {
      // 1. Add user to global banned collection
      await setDoc(doc(db, "bannedUsers", report.reportedUserId), {
        bannedAt: new Date(),
        nickname: report.reportedUserNickname || "Unknown",
        reason: "Admin review from campus chat safety report"
      });

      // 2. Delete the report document
      await deleteDoc(doc(db, "reports", report.id));
      
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      alert("User successfully banned globally.");
    } catch (error) {
      console.error("Error banning user globally:", error);
      alert("Failed to ban user. Check console for details.");
    }
  };

  // Action 2: Dismiss Report (False Alarm / Clear)
  const handleDismissReport = async (reportId: string) => {
    const confirmed = window.confirm("Are you sure you want to dismiss and delete this report?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "reports", reportId));
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (error) {
      console.error("Error dismissing report:", error);
      alert("Failed to dismiss report.");
    }
  };

  // Loading state while checking auth cookie
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center font-mono text-sm">
        Verifying security clearance...
      </div>
    );
  }

  // 1. Gatekeeper Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-rose-500 uppercase tracking-widest font-bold">Encrypted Gateway</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Admin Login</h1>
            <p className="text-xs font-mono text-neutral-400">Environment-secured authentication required.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                name="password"
                placeholder="Enter admin password..."
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-rose-500 transition-all"
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

  // 2. Protected Dashboard View
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
          <div>
            <span className="font-mono text-xs text-emerald-500 uppercase tracking-widest font-bold">Secure Session Active</span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1">
              Campus Chat Safety Reports
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="font-mono text-xs text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Destroy Session
            </button>
            <Link href="/" className="font-mono text-xs text-neutral-400 hover:text-white transition-colors uppercase tracking-wider">
              ← Back to App
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-sm text-neutral-500 animate-pulse">
            Loading secure reports ledger...
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="p-6 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                      Report ID: {report.id}
                    </span>
                    <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                      Room Status: {report.roomStatus}
                    </span>
                  </div>
                  <span className="text-neutral-500">{report.createdAt}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs bg-neutral-900 p-4 rounded-lg border border-neutral-800/60">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase tracking-widest">Reporter ID:</span>
                    <span className="text-neutral-300 break-all">{report.reporterId}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase tracking-widest">Reported User Nickname:</span>
                    <span className="text-amber-400 font-bold break-all text-sm">{report.reportedUserNickname}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase tracking-widest">Reported User ID:</span>
                    <span className="text-rose-400 font-semibold break-all">{report.reportedUserId || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="font-mono text-xs text-neutral-500 flex items-center gap-2">
                    <span>Room Reference:</span>
                    {report.roomId ? (
                      <Link 
                        href={`/chat/${report.roomId}`} 
                        target="_blank"
                        className="text-emerald-400 hover:text-emerald-300 underline font-mono tracking-wider transition-colors inline-flex items-center gap-1"
                      >
                        <span>{report.roomId}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </Link>
                    ) : (
                      <span className="text-neutral-600">None</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {report.roomId && (
                      <Link
                        href={`/chat/${report.roomId}`}
                        target="_blank"
                        className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold uppercase rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>Visit Room</span>
                      </Link>
                    )}
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleGlobalBan(report)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Global Ban User
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="py-20 text-center bg-neutral-950 border border-neutral-800 rounded-xl">
                <p className="font-mono text-sm text-neutral-400">No pending safety reports at the moment.</p>
                <p className="font-mono text-xs text-neutral-600 mt-1">The SLU campus matching queue is safe and clean.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}