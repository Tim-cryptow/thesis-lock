import { type ReactNode } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg text-foreground/80 leading-relaxed">{children}</p>;
}

export function H2({ children }: { children: string }) {
  return (
    <h2 id={slugify(children)} className="text-2xl mt-12 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: string }) {
  return (
    <h3 id={slugify(children)} className="text-xl mt-8 mb-3 scroll-mt-24">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="my-4 text-foreground/80 leading-relaxed">{children}</p>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-sm rounded bg-foreground/5 px-1.5 py-0.5">
      {children}
    </code>
  );
}

export function CodeBlock({
  children,
  language,
}: {
  children: string;
  language?: string;
}) {
  return (
    <pre
      data-language={language}
      className="my-4 overflow-x-auto rounded-md border border-foreground/10 bg-foreground/5 p-4 text-xs md:text-sm font-mono leading-relaxed"
    >
      <code>{children}</code>
    </pre>
  );
}

export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-foreground/15 text-left">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium text-foreground/70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-foreground/10 align-top">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4 text-foreground/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="my-4 list-disc pl-6 space-y-2 text-foreground/80">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}
