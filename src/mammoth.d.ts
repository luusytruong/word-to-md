declare module "mammoth" {
  export function convertToHtml(
    options: any,
  ): Promise<{ value: string; messages: any[] }>;
  export function extractRawText(
    options: any,
  ): Promise<{ value: string; messages: any[] }>;
}
