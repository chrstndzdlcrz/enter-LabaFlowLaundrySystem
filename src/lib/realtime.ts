/**
 * Realtime channel topics must be unique per subscription.
 *
 * Reusing a topic while the previous channel is still being torn down makes
 * Supabase throw "cannot add `postgres_changes` callbacks ... after `subscribe()`",
 * which blanks the page. React runs effects twice in development (and remounts on
 * fast refresh), so every subscription gets its own topic.
 */
let counter = 0;

export function realtimeTopic(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
