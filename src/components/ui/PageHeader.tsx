// Page opener (redesign PR 8): sentence-case label, Archivo h1 at display
// width, lead in --text-2. Styles live in globals.css (`.ph*`).
export function PageHeader({
  label,
  title,
  sub,
}: {
  label?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="ph">
      {label && <p className="ph-label">{label}</p>}
      <h1 className="ph-title">{title}</h1>
      {sub && <p className="ph-sub">{sub}</p>}
    </div>
  );
}
