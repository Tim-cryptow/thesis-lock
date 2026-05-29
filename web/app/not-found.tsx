import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        &larr; ThesisLock
      </Link>
      <h1 className="text-3xl mt-8 mb-2">Page not found.</h1>
      <p className="text-foreground/70">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
