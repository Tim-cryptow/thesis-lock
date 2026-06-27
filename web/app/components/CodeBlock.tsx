"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

type Props = {
  code: string;
  language: string;
  title?: string;
  copyable?: boolean;
};

// Keyword sets per supported language. Anything not listed falls through as
// plain text, so an unknown word never breaks rendering.
const KEYWORDS: Record<string, string[]> = {
  javascript: [
    "const",
    "let",
    "var",
    "function",
    "return",
    "import",
    "from",
    "export",
    "async",
    "await",
    "new",
    "if",
    "else",
    "for",
    "while",
    "class",
    "extends",
    "try",
    "catch",
    "finally",
    "throw",
    "of",
    "in",
    "typeof",
    "default",
    "null",
    "true",
    "false",
    "undefined",
    "console",
    "this",
    "void",
  ],
  python: [
    "def",
    "return",
    "import",
    "from",
    "as",
    "if",
    "else",
    "elif",
    "for",
    "while",
    "class",
    "try",
    "except",
    "finally",
    "raise",
    "with",
    "in",
    "is",
    "not",
    "and",
    "or",
    "None",
    "True",
    "False",
    "print",
    "lambda",
    "pass",
    "break",
    "continue",
    "global",
    "yield",
    "assert",
  ],
  bash: [
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "in",
    "do",
    "done",
    "while",
    "case",
    "esac",
    "function",
    "echo",
    "export",
    "local",
    "return",
    "set",
    "curl",
    "jq",
    "npx",
    "npm",
    "docker",
    "bash",
    "sh",
    "exit",
    "read",
  ],
  yaml: ["true", "false", "null", "yes", "no", "on", "off"],
  json: ["true", "false", "null"],
};

// Line-comment prefix per language. JSON has no comments.
const COMMENT_PREFIX: Record<string, string | null> = {
  javascript: "//",
  python: "#",
  bash: "#",
  yaml: "#",
  json: null,
};

const STRING_PATTERN = "\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`";

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Builds the master tokenizer for a language. Strings are matched before
// comments so a comment character inside a string is not mistaken for a
// comment.
function buildTokenizer(language: string): RegExp {
  const commentPrefix = COMMENT_PREFIX[language] ?? null;
  const parts = [`(?<str>${STRING_PATTERN})`];
  if (commentPrefix) {
    parts.push(`(?<comment>${escapeForRegex(commentPrefix)}.*)`);
  }
  parts.push("(?<num>\\b\\d+(?:\\.\\d+)?\\b)");
  parts.push("(?<word>[A-Za-z_][A-Za-z0-9_]*)");
  return new RegExp(parts.join("|"), "g");
}

function highlightLine(line: string, tokenizer: RegExp, keywords: Set<string>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  // Reset because the tokenizer is reused across lines.
  tokenizer.lastIndex = 0;

  for (const match of line.matchAll(tokenizer)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(line.slice(lastIndex, index));
    }
    const groups = match.groups ?? {};
    const text = match[0];
    if (groups.str !== undefined) {
      nodes.push(
        <span key={key++} className="text-green-400">
          {text}
        </span>,
      );
    } else if (groups.comment !== undefined) {
      nodes.push(
        <span key={key++} className="text-gray-500">
          {text}
        </span>,
      );
    } else if (groups.num !== undefined) {
      nodes.push(
        <span key={key++} className="text-orange-400">
          {text}
        </span>,
      );
    } else if (groups.word !== undefined && keywords.has(text)) {
      nodes.push(
        <span key={key++} className="text-blue-400">
          {text}
        </span>,
      );
    } else {
      nodes.push(text);
    }
    lastIndex = index + text.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}

export default function CodeBlock({ code, language, title, copyable = true }: Props) {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    const tokenizer = buildTokenizer(language);
    const keywords = new Set(KEYWORDS[language] ?? []);
    // Trailing newline would render an empty final line; drop it.
    const source = code.replace(/\n$/, "");
    return source.split("\n").map((line) => highlightLine(line, tokenizer, keywords));
  }, [code, language]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }, [code]);

  return (
    <div className="my-4 overflow-hidden rounded-md border border-white/10 bg-[#0d1117] text-[#c9d1d9]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-wide text-gray-400">
          {title ?? language}
        </span>
        {copyable ? (
          <button
            type="button"
            onClick={copy}
            className="rounded border border-white/10 px-2 py-1 text-xs text-gray-300 hover:border-white/30 hover:text-white"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <pre className="py-3 text-xs leading-relaxed md:text-sm">
          <code className="block font-mono">
            {lines.map((nodes, i) => (
              <span key={i} className="flex">
                <span
                  aria-hidden="true"
                  className="select-none px-4 text-right text-gray-600"
                  style={{ minWidth: "3rem" }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 whitespace-pre pr-4">{nodes}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
