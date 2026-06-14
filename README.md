# 📄 Word to Markdown Converter (word-to-md)

🇺🇸 English | [🇻🇳 Tiếng Việt](./README.vi.md)

_A lightweight, blazing-fast, and efficient tool to seamlessly convert Word documents (DOCX) directly to Markdown format._

---

If this SDK saves you time, please consider giving it a **⭐ Star**! Your support is a massive motivation for solo developers like me to keep maintaining and improving this package! 🙏

## 🌟 Introduction

**word-to-md** is a minimalistic library and a highly-capable CLI designed to help you easily extract content from `.docx` files and perfectly convert it into Markdown (`.md`). The core logic ensures high-fidelity conversions and guarantees great compatibility with Web (Browser), Node.js environments, and terminal operations.

## 🚀 Key Features

- **Blazing-Fast & Multi-threaded**: Uses concurrent processing (`p-limit`) for lightning-fast batch conversions.
- **Advanced CLI**: Robust file/folder handling, recursive directory parsing, collision resolution, and detailed summary logs.
- **Fidelity**: Preserves fundamental structures including **Bold**, _Italic_, Headings, Lists, Tables.
- **Isomorphic**: Works flawlessly natively on browsers and Node.js.
- **Type-safe**: Fully built with TypeScript.

## 📦 Installation

Install globally to use the CLI anywhere, or locally to use the SDK:

```bash
# Global installation for CLI usage
npm install -g word-to-md

# Local project installation
npm install word-to-md
# or pnpm add word-to-md
# or yarn add word-to-md
```

## 💻 CLI Usage (Advanced)

The built-in CLI is incredibly powerful, handling edge cases gracefully and supporting deeply nested directories with concurrent processing to maximize performance.

```bash
# Convert a single file
word2md ./document.docx

# Convert an entire directory concurrently
word2md ./my-folder -o ./output-folder

# Advanced Options:
word2md <input> [options]
  -o, --output <path>       Output directory or markdown file
  --in-place                Write markdown files next to source documents
  --flat                    Flatten output directory structure
  --overwrite               Overwrite existing markdown files
  --verbose                 Show detailed conversion logs
  --concurrency <n>         Number of files processed in parallel (default: "5")
```

The CLI features comprehensive collision prevention, skipping existing files (unless `--overwrite` is provided), and beautiful batch summary logs!

## 🛠 SDK Usage

With just ONE import, you can parse DOCX buffers gracefully in your own project.

```typescript
import { convertBufferToMarkdown } from "word-to-md";
import fs from "fs";

async function main() {
  const fileBuffer = fs.readFileSync("./my-document.docx");
  const markdownText = await convertBufferToMarkdown(fileBuffer);

  console.log(markdownText);
}

main();
```

## 🤝 Contributing

I warmly welcome ideas, bug reports, and Pull Requests from everyone. Please open an Issue first!

## 📜 License

This project is open-sourced under the **MIT** license. I actively encourage you to use, contribute, and share.
