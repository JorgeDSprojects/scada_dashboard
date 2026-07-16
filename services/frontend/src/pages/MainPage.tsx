import React from "react";

import { createDashboard, deleteDashboard, listDashboards } from "../api/client";
import type { Dashboard } from "../types/dashboard";

function getOpenPath(dashboard: Dashboard): string {
  return dashboard.status === "published" ? `/dashboards/${dashboard.id}` : `/editor/${dashboard.id}`;
}

function navigateToPath(path: string): void {
  try {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch {
    window.location.assign(path);
  }
}

export function MainPage() {
  const [dashboards, setDashboards] = React.useState<Dashboard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadDashboards = async () => {
      try {
        const data = await listDashboards();
        if (isMounted) {
          setDashboards(data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load dashboards.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboards();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (dashboard: Dashboard) => {
    const accepted = window.confirm(`Delete dashboard \"${dashboard.name}\"?`);
    if (!accepted) {
      return;
    }

    try {
      await deleteDashboard(dashboard.id);
      setDashboards((previous) => previous.filter((item) => item.id !== dashboard.id));
      setError(null);
    } catch {
      setError("Unable to delete dashboard.");
    }
  };

  const handleCreateDashboard = async () => {
    try {
      const created = await createDashboard({
        name: "New dashboard",
        description: "",
        pipeline: "realtime",
        status: "draft",
      });

      setError(null);
      navigateToPath(`/editor/${created.id}`);
    } catch {
      setError("Unable to create dashboard.");
    }
  };

  return (
    <section>
      <h1>Dashboards</h1>
      <button
        type="button"
        onClick={() => {
          void handleCreateDashboard();
        }}
      >
        New dashboard
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Pipeline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5}>Loading dashboards...</td>
            </tr>
          ) : dashboards.length === 0 ? (
            <tr>
              <td colSpan={5}>No dashboards available.</td>
            </tr>
          ) : (
            dashboards.map((dashboard) => (
              <tr key={dashboard.id}>
                <td>{dashboard.name}</td>
                <td>{dashboard.description}</td>
                <td>{dashboard.pipeline}</td>
                <td>{dashboard.status}</td>
                <td>
                  <a href={getOpenPath(dashboard)} aria-label={`Open ${dashboard.name}`}>
                    Open
                  </a>{" "}
                  <a href={`/editor/${dashboard.id}`} aria-label={`Edit ${dashboard.name}`}>
                    Edit
                  </a>{" "}
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(dashboard);
                    }}
                    aria-label={`Delete ${dashboard.name}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
