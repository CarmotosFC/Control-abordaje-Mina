export default function Badge({ children, tone = "default" }) {
  const tones = {
    default: "bg-sand-100 text-sand-900/70 border-sand-200",
    good: "bg-brand-100 text-brand-800 border-brand-300",
    bad: "bg-rose-100 text-rose-800 border-rose-300",
    warn: "bg-amber-100 text-amber-800 border-amber-300",
    orange: "bg-orange-100 text-orange-800 border-orange-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tones[tone]}`}>
      {children}
    </span>
  );
}
