export function LoadingState({ label = "Memuat..." }: { label?: string }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {label}
    </p>
  );
}
