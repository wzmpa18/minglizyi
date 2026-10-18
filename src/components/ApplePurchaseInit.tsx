"use client";
import { useEffect } from "react";
import { getUserToken } from "@/lib/auth";
import { isAppleLearningBuild, listenForAppleTransactions, restoreApplePurchases } from "@/lib/appleIap";

export default function ApplePurchaseInit() {
  useEffect(() => {
    if (!isAppleLearningBuild()) return;
    let remove: (() => Promise<void>) | undefined;
    let disposed = false;
    let lastToken = getUserToken();
    const recover = () => { if (getUserToken() && document.visibilityState === "visible") void restoreApplePurchases(false).catch(() => { /* Unfinished purchases remain retryable; purchase pages show details. */ }); };
    void listenForAppleTransactions(recover).then(handle => { if (disposed) void handle.remove(); else remove = () => handle.remove(); }).catch(() => {});
    recover();
    const authChanged = () => { const token = getUserToken(); if (token !== lastToken) { lastToken = token; recover(); } };
    window.addEventListener("online", recover);
    window.addEventListener("yandao-auth-change", authChanged);
    document.addEventListener("visibilitychange", recover);
    return () => { disposed = true; void remove?.(); window.removeEventListener("online", recover); window.removeEventListener("yandao-auth-change", authChanged); document.removeEventListener("visibilitychange", recover); };
  }, []);
  return null;
}
