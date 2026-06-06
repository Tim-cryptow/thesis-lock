import { getAnchorAt, getAnchorCount, type RegistryEntry } from "./stacks";

const BATCH_SIZE = 5;

export async function fetchAllAnchors(
  owner: string,
): Promise<RegistryEntry[]> {
  const count = await getAnchorCount(owner);
  if (count <= 0) return [];

  const entries: RegistryEntry[] = [];
  for (let start = 0; start < count; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, count);
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);
    const batch = await Promise.all(
      indices.map((index) => getAnchorAt(owner, index)),
    );
    for (const entry of batch) {
      if (entry) entries.push(entry);
    }
  }

  // The registry appends with an increasing index, so the highest index is the
  // newest anchor. Reverse the index-ordered list to return newest-first.
  return entries.reverse();
}
