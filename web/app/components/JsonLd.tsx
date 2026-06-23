// Renders a schema.org JSON-LD block as a script tag. Kept a server component
// so the structured data is present in the initial HTML for crawlers. The data
// is always app-authored (never user input), so serializing it inline is safe.
type JsonLdProps = {
  data: Record<string, unknown>;
};

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
