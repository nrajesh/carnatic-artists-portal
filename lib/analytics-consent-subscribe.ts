/** Re-read consent when another tab changes storage or the tab becomes visible again. */
export function subscribeDocumentConsentSignals(onStoreChange: () => void): () => void {
  const onStorage = () => onStoreChange();
  const onVisibility = () => {
    if (document.visibilityState === "visible") onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
