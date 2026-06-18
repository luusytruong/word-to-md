import * as mammoth from "mammoth";
import { htmlToMarkdown } from "./converter";

/**
 * Converts a Word document buffer or ArrayBuffer to Markdown.
 * @param buffer - The file buffer or ArrayBuffer.
 * @returns The generated Markdown text.
 */
export async function convertBufferToMarkdown(
  buffer: Buffer | ArrayBuffer,
): Promise<string> {
  const options =
    buffer instanceof ArrayBuffer
      ? { arrayBuffer: buffer }
      : { buffer: buffer };
  const htmlResult = await mammoth.convertToHtml(options);
  const markdown = (await htmlToMarkdown(htmlResult.value)).trim() + "\n";
  return markdown;
}

export { htmlToMarkdown };
