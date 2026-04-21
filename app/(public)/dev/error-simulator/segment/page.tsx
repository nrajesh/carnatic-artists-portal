/**
 * Server render throws here so {@link app/error.tsx} (segment boundary) runs.
 */
export default function DevSegmentErrorSimulatorPage() {
  throw new Error("Dev-only: segment error boundary (server render)");
}
