export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-surface-2" />
    </div>
  );
}
