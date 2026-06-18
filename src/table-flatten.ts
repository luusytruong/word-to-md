/**
 * TABLE → MARKDOWN  (with full merge-cell flattening)
 *
 * Core algorithm:
 *   Build a 2-D grid (rowCount × colCount) of strings.
 *   Walk each <tr>/<td>/<th>, which must already carry correct
 *   rowspan/colspan attributes (set by docx-preview in the browser,
 *   or by mammoth's table-cell colSpan support + our own vMerge
 *   post-processing on Node — see node.ts).
 *   For each cell, find the first free slot in the grid, then place
 *   its content ONLY in the top-left slot of the span (dr=0, dc=0).
 *   Every OTHER slot the span covers — whether reached via colspan
 *   (same row, columns to the right) or rowspan (rows below) — is
 *   left empty. This matches how a merged cell actually looks when
 *   unmerged: one cell holds the text, its former neighbors are blank.
 *
 * This module is environment-agnostic: it only relies on the
 * standard DOM Element/Node interfaces (querySelectorAll, getAttribute,
 * childNodes, tagName, textContent), which both real browser DOM and
 * jsdom implement identically. It must NOT import anything browser- or
 * Node-specific.
 */

export interface CellToMdInline {
  (td: GenericElement, ctx: ConvertContext): string;
}

export interface ConvertContext {
  listStack: { type: string; count: number }[];
}

// Minimal structural typing so this file has no hard dependency on
// "dom" lib types nor on Node's jsdom types — both satisfy this shape.
export interface GenericElement {
  tagName: string;
  childNodes: ArrayLike<any>;
  children?: ArrayLike<GenericElement>;
  textContent?: string | null;
  getAttribute(name: string): string | null;
  querySelectorAll(selector: string): ArrayLike<GenericElement>;
}

export function flattenTableToMd(
  tableEl: GenericElement,
  cellToMdInline: CellToMdInline,
): string {
  // Collect all <tr> elements — direct children only (avoid nested tables)
  const rows = Array.from(
    tableEl.querySelectorAll(
      ":scope > tbody > tr, :scope > thead > tr, :scope > tfoot > tr, :scope > tr",
    ),
  );
  if (!rows.length) return "";

  const ctx: ConvertContext = { listStack: [] };

  // ── Phase 1: build a sparse grid to determine dimensions ──
  // grid[r][c] = cell content string | null (occupied by a span)
  const grid: (string | null)[][] = []; // grid[row][col] = string | null
  const occupied = new Set<string>(); // "r,c" strings

  function firstFreeCol(r: number): number {
    let c = 0;
    while (occupied.has(`${r},${c}`)) c++;
    return c;
  }

  function markOccupied(r: number, c: number, rs: number, cs: number): void {
    for (let dr = 0; dr < rs; dr++) {
      for (let dc = 0; dc < cs; dc++) {
        occupied.add(`${r + dr},${c + dc}`);
      }
    }
  }

  function ensureRow(r: number): void {
    while (grid.length <= r) grid.push([]);
  }

  // ── Phase 2: place cells into grid ──
  rows.forEach((tr, r) => {
    ensureRow(r);
    const cells = Array.from(tr.querySelectorAll(":scope > td, :scope > th"));
    cells.forEach((td) => {
      const rs = parseInt(td.getAttribute("rowspan") || "1", 10) || 1;
      const cs = parseInt(td.getAttribute("colspan") || "1", 10) || 1;
      const c = firstFreeCol(r);

      // Convert cell content to markdown inline
      const content = cellToMdInline(td, ctx);

      // Place content ONLY at the span's top-left corner (dr=0, dc=0).
      // Every other cell the span covers — to the right (colspan) or
      // below (rowspan) — is left as an empty string, since that's
      // what an actually-unmerged cell would contain.
      for (let dr = 0; dr < rs; dr++) {
        ensureRow(r + dr);
        for (let dc = 0; dc < cs; dc++) {
          const col = c + dc;
          while (grid[r + dr].length <= col) grid[r + dr].push(null);
          grid[r + dr][col] = dr === 0 && dc === 0 ? content : "";
        }
      }

      markOccupied(r, c, rs, cs);
    });
  });

  if (!grid.length) return "";

  // ── Phase 3: normalize — fill nulls, ensure equal column count ──
  const colCount = Math.max(...grid.map((r) => r.length));
  const normalized = grid.map((row) => {
    const out: string[] = [];
    for (let c = 0; c < colCount; c++) {
      out.push(row[c] != null ? (row[c] as string) : "");
    }
    return out;
  });

  // ── Phase 4: render to Markdown pipe table ──
  const cellDisplayWidth = (s: string) =>
    Math.max(...s.split("<br>").map((l) => l.replace(/\*\*|_|~~/g, "").length));

  const colWidths = Array.from({ length: colCount }, (_, i) =>
    Math.max(3, ...normalized.map((r) => cellDisplayWidth(r[i] || ""))),
  );

  const fmtRow = (cells: string[]) =>
    "| " +
    cells.map((c, i) => (c || "").padEnd(colWidths[i])).join(" | ") +
    " |";
  const sepRow = "| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |";

  const [head, ...body] = normalized;
  return (
    "\n" + fmtRow(head) + "\n" + sepRow + "\n" + body.map(fmtRow).join("\n") + "\n"
  );
}
