// Montréal Canadiens logo — used on the FR locale only,
// signalling local team pride alongside the Data Joule wordmark.
export function HabsLogo({ className }: { className?: string }) {
  return (
    <img
      src="/habs.webp"
      alt="Montréal Canadiens"
      className={className}
    />
  )
}
