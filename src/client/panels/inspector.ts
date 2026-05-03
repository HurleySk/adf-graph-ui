import { Core } from "cytoscape";
import { NODE_COLORS } from "../graph/renderer.js";
import { callTool } from "../api.js";
import { applyImpactAnalysis, applyLineage, applyValidation, clearOverlays } from "../graph/overlays.js";
import { focusNode } from "../graph/interactions.js";

export function initInspector(
  container: HTMLElement,
  cy: Core,
): { onNodeSelect: (id: string, data: Record<string, unknown>) => void; onNodeDeselect: () => void } {
  function onNodeSelect(nodeId: string, data: Record<string, unknown>) {
    const color = NODE_COLORS[data.nodeType as string] ?? "#7a8899";
    const incoming = (data.incoming as any[]) ?? [];
    const outgoing = (data.outgoing as any[]) ?? [];
    const metadata = (data.metadata as Record<string, unknown>) ?? {};

    container.innerHTML = `
      <div class="inspector-content">
        <div class="inspector-header">
          <div class="inspector-dot" style="background:${color}"></div>
          <div>
            <div class="inspector-name">${escapeHtml(data.name as string)}</div>
            <div class="inspector-type">${data.nodeType}</div>
          </div>
        </div>

        <div class="inspector-section">
          <div class="inspector-label">Incoming <span class="inspector-count">${incoming.length}</span></div>
          ${incoming.length === 0 ? '<div class="inspector-empty">—</div>' : ""}
          ${incoming.map((e: any) => `
            <div class="inspector-connection" data-node-id="${escapeHtmlStatic(e.fromId)}">
              <span class="conn-arrow">←</span>
              <span class="conn-name" style="color:${NODE_COLORS[e.fromType] ?? "#ccc"}">${escapeHtml(e.from)}</span>
              <span class="conn-edge-type">${escapeHtmlStatic(e.type)}</span>
            </div>
          `).join("")}
        </div>

        <div class="inspector-section">
          <div class="inspector-label">Outgoing <span class="inspector-count">${outgoing.length}</span></div>
          ${outgoing.length === 0 ? '<div class="inspector-empty">—</div>' : ""}
          ${outgoing.map((e: any) => `
            <div class="inspector-connection" data-node-id="${escapeHtmlStatic(e.toId)}">
              <span class="conn-arrow">→</span>
              <span class="conn-name" style="color:${NODE_COLORS[e.toType] ?? "#ccc"}">${escapeHtml(e.to)}</span>
              <span class="conn-edge-type">${escapeHtmlStatic(e.type)}</span>
            </div>
          `).join("")}
        </div>

        ${renderMetadata(metadata)}

        <div class="inspector-section inspector-actions">
          <div class="inspector-label">Actions</div>
          <button class="action-btn action-impact" data-action="impact">
            <span class="action-icon">◎</span> Impact Analysis
          </button>
          <button class="action-btn action-lineage" data-action="lineage">
            <span class="action-icon">⇶</span> Data Lineage
          </button>
          <button class="action-btn action-validate" data-action="validate">
            <span class="action-icon">✓</span> Validate
          </button>
          <button class="action-btn action-clear" data-action="clear">
            Clear Overlays
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll(".inspector-connection").forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.nodeId;
        if (id) focusNode(cy, id);
      });
    });

    container.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = (btn as HTMLElement).dataset.action;
        const btnEl = btn as HTMLButtonElement;
        btnEl.classList.add("loading");

        try {
          if (action === "clear") {
            clearOverlays(cy);
            return;
          }
          if (action === "impact") {
            const result = await callTool("graph_impact_analysis", {
              target: data.name as string,
              target_type: data.nodeType as string,
              direction: "both",
            });
            applyImpactAnalysis(cy, result);
          }
          if (action === "lineage") {
            const result = await callTool("graph_data_lineage", {
              entity: data.name as string,
              direction: "upstream",
              detail: "full",
            });
            applyLineage(cy, result);
          }
          if (action === "validate") {
            const result = await callTool("graph_validate");
            applyValidation(cy, result);
          }
        } catch (err: any) {
          console.error(`Action ${action} failed:`, err);
        } finally {
          btnEl.classList.remove("loading");
        }
      });
    });
  }

  function onNodeDeselect() {
    container.innerHTML = `
      <div class="inspector-empty-state">
        <div class="empty-icon">⬡</div>
        <p>Select a node to inspect</p>
        <p class="empty-hint">Click any node in the graph</p>
      </div>
    `;
  }

  onNodeDeselect();
  return { onNodeSelect, onNodeDeselect };
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderMetadata(metadata: Record<string, unknown>): string {
  const skip = new Set(["stub", "filePath", "color"]);
  const entries = Object.entries(metadata).filter(([k]) => !skip.has(k));
  if (entries.length === 0) return "";

  return `
    <div class="inspector-section">
      <div class="inspector-label">Metadata</div>
      <div class="inspector-metadata">
        ${entries.map(([k, v]) => {
          const display = typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
          const isLong = display.length > 60;
          return `
            <div class="meta-entry${isLong ? " meta-long" : ""}">
              <span class="meta-key">${escapeHtmlStatic(k)}</span>
              <span class="meta-value">${escapeHtmlStatic(display)}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function escapeHtmlStatic(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
