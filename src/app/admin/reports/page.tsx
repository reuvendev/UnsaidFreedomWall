'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

interface ReportItem {
  id: string;
  postId: string;
  reason: string;
  details: string;
  createdAt: string;
  postContent?: string;
  authorAlias?: string;
  category?: string;
}

export default function AdminReportsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [reports, setReports] = useState<ReportItem[]>([]);
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
      const fetchedReports: ReportItem[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const postId = data.postId;

        let postContent = "[Post was deleted or not found]";
        let authorAlias = "UNSAID #00000";
        let category = "thoughts";

        if (postId) {
          const postRef = doc(db, "posts", postId);
          const postSnap = await getDoc(postRef);
          if (postSnap.exists()) {
            const postData = postSnap.data();
            postContent = postData.content || "";
            authorAlias = postData.authorAlias || "UNSAID #00000";
            category = postData.category || "thoughts";
          }
        }

        fetchedReports.push({
          id: docSnap.id,
          postId: postId || "",
          reason: data.reason || "No reason specified",
          details: data.details || "",
          createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : "Unknown",
          postContent,
          authorAlias,
          category,
        });
      }

      setReports(fetchedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string, reportId: string) => {
    const confirmed = window.confirm("Are you sure you want to permanently delete this reported post?");
    if (!confirmed) return;

    try {
      if (postId) {
        await deleteDoc(doc(db, "posts", postId));
      }
      await deleteDoc(doc(db, "reports", reportId));
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, "reports", reportId));
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (error) {
      console.error("Error dismissing report:", error);
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
              className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-800">
          <div>
            <span className="font-mono text-xs text-emerald-500 uppercase tracking-widest font-bold">Secure Session Active</span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1">
              Flagged Entries Moderation
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="font-mono text-xs text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
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
          <div className="space-y-6">
            {reports.map((report) => (
              <div key={report.id} className="p-6 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                      {report.reason}
                    </span>
                    <span className="text-neutral-400">By: {report.authorAlias}</span>
                  </div>
                  <span className="text-neutral-500">{report.createdAt}</span>
                </div>

                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">Reported Content:</span>
                  <p className="text-base text-neutral-200 bg-neutral-900 p-4 rounded border border-neutral-800/60 leading-relaxed">
                    &ldquo;{report.postContent}&rdquo;
                  </p>
                </div>

                {report.details && (
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">Reporter's Notes:</span>
                    <p className="text-sm text-neutral-300 bg-neutral-900/60 p-3 rounded border border-neutral-800/40 font-mono">
                      &ldquo;{report.details}&rdquo;
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Link 
                    href={`/post/${report.postId}`} 
                    target="_blank"
                    className="font-mono text-xs text-neutral-400 hover:text-white underline transition-colors"
                  >
                    View Post Page ↗
                  </Link>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase rounded transition-colors"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleDeletePost(report.postId, report.id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase rounded transition-colors"
                    >
                      Delete Post
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="py-20 text-center bg-neutral-950 border border-neutral-800 rounded-lg">
                <p className="font-mono text-sm text-neutral-400">No pending reports at the moment.</p>
                <p className="font-mono text-xs text-neutral-600 mt-1">The freedom wall is clean.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}