import type { TelemetryEntry } from './telemetry'

// The Pi pushes a sample every ~5s; 10 min of silence means pi-compute (or its
// pusher) is down, not a slow cycle.
export const TELEMETRY_STALE_SECONDS = 600

// oled_status_writer's staleness guard flips openadr_status to 'offline' 120s
// after the plug feed dies. 15 min of sustained offline rides out a pi-ven
// reboot without paging, while still catching real outages within ~2 cron runs.
export const VEN_GRACE_SECONDS = 900

const VEN_DOWN_STATUSES = new Set(['offline', 'error'])

export type NodeHealthResult = {
  telemetryStale: boolean
  telemetryAgeSec: number | null
  /** VEN currently reporting offline/error (route should track offline-since). */
  venOffline: boolean
  /** Telemetry feed silent past threshold — page for pi-compute. */
  pageTelemetry: boolean
  /** VEN offline past the grace window — page for pi-ven/plug. */
  pageVen: boolean
}

/**
 * Pure alert decision for the node health watchdog.
 *
 * @param latest          telemetry:latest from Redis (null if absent)
 * @param venOfflineSince unix seconds when the VEN was first seen offline
 *                        (health:ven:offline_since), null if not tracking
 * @param nowSec          current unix seconds
 */
export function evaluateNodeHealth(
  latest: TelemetryEntry | null,
  venOfflineSince: number | null,
  nowSec: number
): NodeHealthResult {
  const telemetryAgeSec = latest ? nowSec - latest.timestamp : null
  const telemetryStale = telemetryAgeSec === null || telemetryAgeSec > TELEMETRY_STALE_SECONDS

  // When telemetry itself is stale, the embedded VEN status is stale data —
  // suppress the VEN verdict and page only for the dead feed.
  const venOffline = !telemetryStale && VEN_DOWN_STATUSES.has(latest!.openadr_status)
  const pageVen =
    venOffline && venOfflineSince !== null && nowSec - venOfflineSince > VEN_GRACE_SECONDS

  return {
    telemetryStale,
    telemetryAgeSec,
    venOffline,
    pageTelemetry: telemetryStale,
    pageVen,
  }
}
