export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-dashed p-8 text-center">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
