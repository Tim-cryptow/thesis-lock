import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/sharing" },
  title: { absolute: "Sharing | ThesisLock Docs" },
  description:
    "Share verification results, wallet profiles, groups, and protocol stats on social media and messaging apps, and let people scan a QR code to verify on mobile.",
};

export default function SharingDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Sharing</h1>
      <Lead>
        ThesisLock makes it easy to share what you have verified. Share buttons
        and copyable links appear across the app, and verification pages include
        a scannable QR code so anyone can confirm an anchor from their phone.
      </Lead>

      <H2>Share buttons</H2>
      <P>
        A compact row of share buttons appears on verification pages, wallet
        profiles, group pages, and the protocol stats page. Each row offers:
      </P>
      <List
        items={[
          <>
            <Code>Copy link</Code>: copy the page URL to the clipboard, with a
            short confirmation.
          </>,
          <>Share on X, LinkedIn, or Telegram in a new tab.</>,
        ]}
      />
      <P>
        The links point only to public ThesisLock pages, such as a{" "}
        <Link href="/docs/web-app" className="underline hover:text-foreground">
          verification URL
        </Link>
        . Nothing about your document is included beyond what is already public
        on chain.
      </P>

      <H2>QR codes</H2>
      <P>
        On a verification page, choose <Code>Show QR</Code> to reveal a QR code
        that encodes the verification URL. Scan it with a phone camera to open
        the same verification on another device, which is handy for confirming an
        anchor in person or from a printed page.
      </P>
      <P>
        The QR code is generated entirely in your browser. There is no external
        library, image service, or network request involved: the encoder runs
        locally and renders the code as an SVG, in keeping with the rest of the
        app where everything happens on your device.
      </P>
    </div>
  );
}
