"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

let mermaidInitialized = false;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    flowchart: {
      curve: "basis",
      useMaxWidth: true,
      htmlLabels: false,
    },
  });
  mermaidInitialized = true;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        ensureMermaidInitialized();
        const safeId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const { svg: rendered } = await mermaid.render(safeId, chart);
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void renderChart();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-2xl border border-stone-200 bg-stone-950 p-4 text-xs leading-6 text-stone-100 shadow-sm">
        <code>{chart}</code>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-sm">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-sm [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
