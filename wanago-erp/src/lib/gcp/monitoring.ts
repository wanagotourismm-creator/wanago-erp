import { MetricServiceClient } from "@google-cloud/monitoring";

// Server-only — reuses the same service account key as Firebase Admin
// (a Firebase project's service account IS a Google Cloud service
// account), just with an additional "Monitoring Viewer" IAM role granted
// on top so it can also read Cloud Monitoring's operation-count metrics.
// Read-only: this role cannot see billing/spend, only operation counts —
// real cost tracking is left to Google Cloud's own Budget Alerts instead
// of trying to replicate GCP's pricing formula here.
let client: MetricServiceClient | null = null;

function getMonitoringClient(): MetricServiceClient | null {
  if (client) return client;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    client = new MetricServiceClient({ credentials: JSON.parse(raw) });
    return client;
  } catch {
    return null;
  }
}

// Set whenever sumMetricSince() fails, so the API route can surface the
// real reason (e.g. "permission denied" vs "API not enabled") instead of
// a single generic message — this is the kind of one-off setup that's
// easy to get subtly wrong (IAM role granted but API not enabled, wrong
// project, etc.), so a specific error matters for troubleshooting it.
let lastError: string | null = null;
export function getLastMonitoringError(): string | null {
  return lastError;
}

// Sums a Cloud Monitoring delta metric (e.g. Firestore document reads)
// over the given time window — used for "how many X has today used so
// far," compared against Firebase Spark's daily free-tier limits.
export async function sumMetricSince(metricType: string, since: Date): Promise<number | null> {
  const c = getMonitoringClient();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!c) { lastError = "FIREBASE_SERVICE_ACCOUNT_KEY not configured or invalid"; return null; }
  if (!projectId) { lastError = "NEXT_PUBLIC_FIREBASE_PROJECT_ID not configured"; return null; }

  const now = new Date();
  const windowSeconds = Math.max(60, Math.floor((now.getTime() - since.getTime()) / 1000));

  try {
    const [timeSeries] = await c.listTimeSeries({
      name: c.projectPath(projectId),
      filter: `metric.type="${metricType}"`,
      interval: {
        startTime: { seconds: Math.floor(since.getTime() / 1000) },
        endTime:   { seconds: Math.floor(now.getTime() / 1000) },
      },
      aggregation: {
        alignmentPeriod: { seconds: windowSeconds },
        perSeriesAligner: "ALIGN_SUM",
        crossSeriesReducer: "REDUCE_SUM",
      },
      view: "FULL",
    });

    let total = 0;
    for (const series of timeSeries) {
      for (const point of series.points ?? []) {
        const v = point.value;
        total += Number(v?.int64Value ?? v?.doubleValue ?? 0);
      }
    }
    lastError = null;
    return total;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`[gcp/monitoring] sumMetricSince(${metricType}) failed:`, err);
    return null;
  }
}
