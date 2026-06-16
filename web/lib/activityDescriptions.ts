import type { ActivityEvent } from "./activityLog";

// Human-readable rendering of an activity event. Returns a title, a supporting
// subtitle, and a single-character icon (no emoji, per project convention).
// Strings are English here, matching the existing dashboard activity feed; the
// surrounding page chrome is translated through the i18n layer.

export type ActivityDescription = {
  title: string;
  subtitle: string;
  icon: string;
};

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function truncatePrincipal(principal: string): string {
  if (principal.length <= 13) return principal;
  return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// A label when present, otherwise the truncated hash, otherwise empty.
function labelOrHash(details: Record<string, any>): string {
  const label = str(details.label);
  if (label) return label;
  const hash = str(details.hash);
  return hash ? truncateHash(hash) : "";
}

function groupRef(groupId: number | null): string {
  return groupId !== null ? `Group #${groupId}` : "group";
}

export function describeActivity(event: ActivityEvent): ActivityDescription {
  const d = event.details;
  switch (event.type) {
    case "anchor":
      return {
        title: "Anchored a document",
        subtitle: labelOrHash(d),
        icon: "A",
      };
    case "batch-anchor": {
      const count = num(d.count) ?? 0;
      const batchId = num(d.batchId);
      return {
        title:
          count === 1
            ? "Batch anchored 1 document"
            : `Batch anchored ${count} documents`,
        subtitle: batchId !== null ? `Batch #${batchId}` : "",
        icon: "B",
      };
    }
    case "register":
      return {
        title: "Registered anchor in history",
        subtitle: labelOrHash(d),
        icon: "H",
      };
    case "mint-proof": {
      const tokenId = num(d.tokenId);
      return {
        title:
          tokenId !== null ? `Minted proof NFT #${tokenId}` : "Minted proof NFT",
        subtitle: labelOrHash(d),
        icon: "P",
      };
    }
    case "create-group": {
      const name = str(d.name);
      const groupId = num(d.groupId);
      return {
        title: "Created group",
        subtitle: name || (groupId !== null ? `Group #${groupId}` : ""),
        icon: "C",
      };
    }
    case "add-member": {
      const member = str(d.member);
      const groupId = num(d.groupId);
      return {
        title: "Added member to group",
        subtitle: member
          ? `${truncatePrincipal(member)} to ${groupRef(groupId)}`
          : groupRef(groupId),
        icon: "+",
      };
    }
    case "remove-member": {
      const member = str(d.member);
      const groupId = num(d.groupId);
      return {
        title: "Removed member from group",
        subtitle: member
          ? `${truncatePrincipal(member)} from ${groupRef(groupId)}`
          : groupRef(groupId),
        icon: "−",
      };
    }
    case "group-anchor": {
      const groupId = num(d.groupId);
      const detail = labelOrHash(d);
      return {
        title: "Anchored to group",
        subtitle: detail ? `${groupRef(groupId)} · ${detail}` : groupRef(groupId),
        icon: "G",
      };
    }
    default:
      return { title: "Activity", subtitle: "", icon: "*" };
  }
}
