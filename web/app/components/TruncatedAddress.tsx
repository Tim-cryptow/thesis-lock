"use client";

import Link from "next/link";
import CopyButton from "./CopyButton";

type TruncatedAddressProps = {
  address: string;
  // Number of trailing characters to keep.
  chars?: number;
  linkToProfile?: boolean;
  copyable?: boolean;
};

function truncate(address: string, chars: number): string {
  // Keep the two-character version prefix (SP, SM, ST, ...) and the tail.
  if (address.length <= chars + 3) return address;
  return `${address.slice(0, 2)}...${address.slice(-chars)}`;
}

// Displays a Stacks principal compactly, with the full address on hover. Links
// to the wallet profile by default and shows an inline CopyButton.
export default function TruncatedAddress({
  address,
  chars = 6,
  linkToProfile = true,
  copyable = true,
}: TruncatedAddressProps) {
  if (!address) return null;

  const short = truncate(address, chars);
  const className = "mono text-xs text-foreground/80 transition hover:text-foreground";

  return (
    <span className="inline-flex items-center gap-1.5">
      {linkToProfile ? (
        <Link
          href={`/u/${address}`}
          title={address}
          className={`${className} underline-offset-2 hover:underline`}
        >
          {short}
        </Link>
      ) : (
        <span title={address} className={className}>
          {short}
        </span>
      )}
      {copyable ? <CopyButton value={address} label="address" size="sm" /> : null}
    </span>
  );
}
