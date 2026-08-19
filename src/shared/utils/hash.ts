/**
 * Fast, deterministic content hash (djb2). Used to detect CSS changes so we
 * can replace an existing style tag instead of duplicating it.
 */
export function contentHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}