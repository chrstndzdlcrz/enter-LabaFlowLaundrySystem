import { EmptyState, ErrorState } from "./empty-state";
import { LoadingState } from "./loading-state";

/**
 * One place to render the loading, error and empty branches of a query, so every
 * list and detail view behaves consistently.
 */
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyIcon,
  emptyAction,
  loadingLabel,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentProps<typeof EmptyState>["icon"];
  emptyAction?: React.ReactNode;
  loadingLabel?: string;
  children: React.ReactNode;
}) {
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (error) {
    return (
      <ErrorState
        description={error instanceof Error ? error.message : "Please try again in a moment."}
      />
    );
  }
  if (isEmpty) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }
  return <>{children}</>;
}
