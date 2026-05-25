// Quebec flag — uses the user-provided JPG for an authentic look.
export function QcFlag({ className }: { className?: string }) {
  return (
    <img
      src="/logos/quebec-flag.jpg"
      alt="Drapeau du Québec"
      className={className}
    />
  )
}
