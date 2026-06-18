import {
  flattenTableToMd,
  ConvertContext,
  GenericElement,
} from "./table-flatten";

export async function htmlToMarkdown(html: string): Promise<string> {
  const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined";
  let bodyNode: any, NodeClass: any;

  if (isBrowser) {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    bodyNode = doc.body;
    NodeClass = window.Node;
  } else {
    // Use dynamic import for ESM compatibility in Node.js
    const { JSDOM } = await import("jsdom");
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
    Array.from(node.childNodes as ArrayLike<any>)
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
      const trimmed = raw.trim();
      if (!trimmed) return raw;
      const lead = raw.match(/^(\s*)/)?.[1] ?? "";
      const trail = raw.match(/(\s*)$/)?.[1] ?? "";
      return lead + "**" + trimmed + "**" + trail;
    }
    case "em":
    case "i": {
      const raw = ch().replace(/\t/g, " ");
      const trimmed = raw.trim();
      if (!trimmed) return raw;
      const lead = raw.match(/^(\s*)/)?.[1] ?? "";
      const trail = raw.match(/(\s*)$/)?.[1] ?? "";
      return lead + "_" + trimmed + "_" + trail;
    }

    case "u":
      return ch();
    case "del":
    case "s":
      return "~~" + ch().trim() + "~~";
    case "code":
      return "`" + ch() + "`";
    case "pre":
      return "\n```\n" + (node.textContent || "").trim() + "\n```\n";
    case "br":
      return "<br>";
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
      return src ? `![${alt}](${src})` : "";
    }

    case "ul": {
      ctx.listStack.push({ type: "ul", count: 0 });
      const depth = ctx.listStack.length - 1;
      const out =
        "\n" +
        Array.from(node.children as ArrayLike<any>)
          .map(
            (li) =>
              "  ".repeat(depth) + "- " + listItemToMd(li, ctx, NodeClass),
          )
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
        Array.from(node.children as ArrayLike<any>)
          .map((li) => {
            ctx.listStack[ctx.listStack.length - 1].count++;
            const n = ctx.listStack[ctx.listStack.length - 1].count;
            return (
              "  ".repeat(depth) + n + ". " + listItemToMd(li, ctx, NodeClass)
            );
          })
          .join("\n") +
        "\n";
      ctx.listStack.pop();
      return out;
    }

    case "table":
      return (
        flattenTableToMd(node as GenericElement, (td) =>
          cellToMdInline(td, NodeClass),
        ) + "\n"
      );

    default:
      return ch();
  }
}

function listItemToMd(li: any, ctx: ConvertContext, NodeClass: any): string {
  let text = "";
  let sublists = "";
  for (const child of Array.from(li.childNodes as ArrayLike<any>)) {
    const t = child.tagName ? child.tagName.toLowerCase() : "";
    if (t === "ul" || t === "ol") {
      sublists += "\n" + nodeToMd(child, ctx, NodeClass).replace(/^\n/, "");
    } else {
      text += nodeToMd(child, ctx, NodeClass);
    }
  }
  return text.trim() + sublists;
}

function cellToMdInline(td: any, NodeClass: any): string {
  const innerCtx: ConvertContext = { listStack: [] };
  const paras: string[] = [];

  for (const child of Array.from(td.childNodes as ArrayLike<any>)) {
    const tag = child.tagName ? child.tagName.toLowerCase() : "";
    let text: string;
    if (tag === "p") {
      text = Array.from(child.childNodes as ArrayLike<any>)
        .map((c) => nodeToMd(c, innerCtx, NodeClass))
        .join("")
        .trim();
    } else {
      text = nodeToMd(child, innerCtx, NodeClass);
    }
    if (text.trim()) paras.push(text.trim());
  }

  return paras.join("<br>").replace(/\|/g, "\\|").replace(/\n/g, " ") || " ";
}
