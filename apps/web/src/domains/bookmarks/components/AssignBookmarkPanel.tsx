import {
  useBookmarksControllerGetOne,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, Loading, NoData, PageHeader, Stack } from "@bookmark-manager/ui";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { AssignBookmarkFields } from "./AssignBookmarkFields";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { routeForQueryError } from "../../../lib/helpers/query-error-route.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { BookmarkAccessRole } from "../constants/bookmark-access.constant";
import { bookmarkAccessRole } from "../helpers/bookmark-access.helper";
import { useBookmarkAssignment } from "../hooks/useBookmarkAssignment";

export function AssignBookmarkPanel() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const canFetchApi = isApiAuthReady && Boolean(id);

  const meQuery = useMeControllerMe({
    query: {
      enabled: canFetchApi,
      queryKey: ["/me"],
    },
  });

  const bookmarkQuery = useBookmarksControllerGetOne(id, {
    query: {
      enabled: canFetchApi,
      queryKey: [`/bookmarks/${id}`],
    },
  });

  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!bookmarkQuery.data || hydrated) {
      return;
    }
    setCollectionIds(bookmarkQuery.data.collectionIds);
    setHydrated(true);
  }, [bookmarkQuery.data, hydrated]);

  const assignment = useBookmarkAssignment(id, {
    onSuccess: () => {
      showSuccess("Bookmark updated.");
      navigate("/bookmarks", { replace: true });
    },
  });

  if (!id) {
    return <Navigate to="/404" replace />;
  }

  if (bookmarkQuery.isError) {
    const route = routeForQueryError(bookmarkQuery.error) ?? "/404";
    return <Navigate to={route} replace />;
  }

  if (
    !isApiAuthReady ||
    bookmarkQuery.isLoading ||
    meQuery.isLoading ||
    !hydrated
  ) {
    return <Loading label="Loading bookmark…" />;
  }

  if (meQuery.isError || !meQuery.data || !bookmarkQuery.data) {
    return <NoData message="Could not load bookmark." />;
  }

  const bookmark = bookmarkQuery.data;
  const role = bookmarkAccessRole(meQuery.data.id, bookmark.ownerId);
  if (role !== BookmarkAccessRole.Owner) {
    return <Navigate to="/403" replace />;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    assignment.mutate(
      {
        id,
        data: { collectionIds },
      },
      {
        onError: (error) => {
          showError(
            getHttpErrorMessage(error, "Could not update bookmark. Try again."),
          );
        },
      },
    );
  }

  return (
    <Stack className="gap-6">
      <PageHeader
        title="Assign bookmark"
        actions={
          <Link
            to="/bookmarks"
            className="text-sm font-medium text-[var(--muted)] no-underline hover:text-[var(--ink)]"
          >
            Cancel
          </Link>
        }
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AssignBookmarkFields
          value={collectionIds}
          onChange={setCollectionIds}
          currentUserId={meQuery.data.id}
          disabled={assignment.isPending}
        />
        <Stack direction="row">
          <Button
            type="submit"
            variant="contained"
            disabled={assignment.isPending}
          >
            Save
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
