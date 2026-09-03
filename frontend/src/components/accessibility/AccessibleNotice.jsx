export default function AccessibleNotice({
  message,
  tone = "info",
  noticeRef,
  className = "",
  children,
}) {
  if (!message && !children) return null;

  const isError = tone === "error";

  return (
    <div
      ref={noticeRef}
      tabIndex="-1"
      className={`accessible-notice accessible-notice--${tone} ${className}`.trim()}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {message}
      {children}
    </div>
  );
}
