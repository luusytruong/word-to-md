interface ConvertContext {
  listStack: { type: string; count: number }[];
}

export function htmlToMarkdown(html: string): string {
  const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined";
  let bodyNode: any, NodeClass: any;

  if (isBrowser) {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    bodyNode = doc.body;
    NodeClass = window.Node;
  } else {
    // Dynamic require so bundlers don't break in browser environment
    const _req = typeof require !== "undefined" ? require : () => ({}) as any;
    const jsdom = _req("jsdom");
    const { JSDOM } = jsdom;
    const dom = new JSDOM(html);
    bodyNode = dom.window.document.body;
    NodeClass = dom.window.Node;
  }

  return nodeToMd(bodyNode, { listStack: [] }, NodeClass).replace(
    /\n{3,}/g,
    "\n\n",
  );
}

function nodeToMd(node: any, ctx: ConvertContext, NodeClass: any): string {
  if (node.nodeType === NodeClass.TEXT_NODE) {
    return (node.textContent || "").replace(/\n/g, " ").replace(/\t/g, " ");
  }
  if (node.nodeType !== NodeClass.ELEMENT_NODE) return "";

  const tag = node.tagName.toLowerCase();
  const ch = () =>
    Array.from(node.childNodes)
      .map((c) => nodeToMd(c, ctx, NodeClass))
      .join("");

  switch (tag) {
    case "h1":
      return "\n# " + ch().trim() + "\n";
    case "h2":
      return "\n## " + ch().trim() + "\n";
    case "h3":
      return "\n### " + ch().trim() + "\n";
    case "h4":
      return "\n#### " + ch().trim() + "\n";
    case "h5":
      return "\n##### " + ch().trim() + "\n";
    case "h6":
      return "\n###### " + ch().trim() + "\n";
    case "p": {
      const t = ch().trim();
      return t ? "\n" + t + "\n" : "\n";
    }
    case "strong":
    case "b": {
      const raw = ch().replace(/\t/g, " ");
      const leadMatch = raw.match(/^(\s*)/);
      const lead = leadMatch ? leadMatch[1] : "";
      const trimmed = raw.trim();
      return trimmed ? lead + "**" + trimmed + "**" : raw;
    }
    case "em":
    case "i": {
      const raw = ch().replace(/\t/g, " ");
      const leadMatch = raw.match(/^(\s*)/);
      const lead = leadMatch ? leadMatch[1] : "";
      const trimmed = raw.trim();
      return trimmed ? lead + "_" + trimmed + "_" : raw;
    }
    case "u":
      return ch();
    case "del":
    case "s":
      return "~~" + ch() + "~~";
    case "code":
      return "`" + ch() + "`";
    case "pre":
      return "\n```\n" + (node.textContent || "").trim() + "\n```\n";
    case "br":
      return "  \n";
    case "hr":
      return "\n---\n";
    case "blockquote":
      return (
        "\n" +
        ch()
          .trim()
          .split("\n")
          .map((l) => "> " + l)
          .join("\n") +
        "\n"
      );
    case "a": {
      const href = node.getAttribute("href") || "";
      const label = ch().trim();
      return href ? `[${label}](${href})` : label;
    }
    case "img": {
      const alt = node.getAttribute("alt") || "image";
      const src = node.getAttribute("src") || "";
      return `![${alt}](${src})`;
    }
    case "ul": {
      ctx.listStack.push({ type: "ul", count: 0 });
      const depth = ctx.listStack.length - 1;
      const out =
        "\n" +
        Array.from(node.children)
          .map((li: any) => {
            const inner = listItemToMd(li, ctx, NodeClass);
            return "  ".repeat(depth) + "- " + inner;
          })
          .join("\n") +
        "\n";
      ctx.listStack.pop();
      return out;
    }
    case "ol": {
      ctx.listStack.push({ type: "ol", count: 0 });
      const depth = ctx.listStack.length - 1;
      const out =
        "\n" +
        Array.from(node.children)
          .map((li: any) => {
            ctx.listStack[ctx.listStack.length - 1].count++;
            const n = ctx.listStack[ctx.listStack.length - 1].count;
            const inner = listItemToMd(li, ctx, NodeClass);
            return "  ".repeat(depth) + n + ". " + inner;
          })
          .join("\n") +
        "\n";
      ctx.listStack.pop();
      return out;
    }
    case "table":
      return tableToMd(node, NodeClass) + "\n";
    default:
      return ch();
  }
}

function listItemToMd(li: any, ctx: ConvertContext, NodeClass: any): string {
  let text = "";
  let sublists = "";
  for (const child of Array.from(li.childNodes)) {
    const childNode = child as any;
    const t = childNode.tagName ? childNode.tagName.toLowerCase() : "";
    if (t === "ul" || t === "ol") {
      sublists += "\n" + nodeToMd(child, ctx, NodeClass).replace(/^\n/, "");
    } else {
      text += nodeToMd(child, ctx, NodeClass);
    }
  }
  return text.trim() + sublists;
}

function tableToMd(table: any, NodeClass: any): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) return "";

  // Convert cell HTML to text, preserving <br> and <p> breaks as "<br>" inline
  const toCell = (td: any) => {
    // Replace block-level breaks with a placeholder before extracting text
    let html = (td.innerHTML || "")
      .replace(/<br\s*\/?>/gi, "\x00BR\x00") // <br>
      .replace(/<\/p>\s*<p[^>]*>/gi, "\x00BR\x00") // </p><p>
      .replace(/<[^>]+>/g, ""); // strip remaining tags
    const decoded = html
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&#\d+;/g, (c: string) =>
        String.fromCharCode(parseInt(c.slice(2, -1))),
      );
    return (
      decoded
        .replace(/\x00BR\x00/g, "<br>") // use HTML <br> inside MD table cell
        .replace(/\|/g, "\\|")
        .replace(/\n/g, " ")
        .trim() || " "
    );
  };

  const allRows = rows.map((tr: any) =>
    Array.from(tr.querySelectorAll("th,td")).map(toCell),
  );
  if (!allRows.length) return "";

  const colCount = Math.max(...allRows.map((r) => r.length));
  const padded = allRows.map((r: any) => {
    while (r.length < colCount) r.push(" ");
    return r;
  });

  // Column widths — measure longest line within each cell (cells may contain <br>)
  const cellWidth = (s: string) =>
    Math.max(...s.split("<br>").map((l) => l.length));
  const colWidths = Array.from({ length: colCount }, (_, i) =>
    Math.max(3, ...padded.map((r: any) => cellWidth(r[i] || ""))),
  );

  const fmtRow = (cells: any) =>
    "| " +
    cells.map((c: string, i: number) => c.padEnd(colWidths[i])).join(" | ") +
    " |";
  const sepRow = "| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |";

  const [head, ...body] = padded;
  return (
    "\n" +
    fmtRow(head) +
    "\n" +
    sepRow +
    "\n" +
    body.map(fmtRow).join("\n") +
    "\n"
  );
}
