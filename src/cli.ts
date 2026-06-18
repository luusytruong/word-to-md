#!/usr/bin/env node
import { program } from "commander";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import pLimit from "p-limit";
import { convertBufferToMarkdown } from "./index";

type ConvertResult = {
  input: string;
  output: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
};

type CliOptions = {
  output?: string;
  inPlace?: boolean;
  flat?: boolean;
  overwrite?: boolean;
  verbose?: boolean;
  concurrency?: string;
};

process.on("SIGINT", () => {
  console.log("\nOperation cancelled.");
  process.exit(130);
});

function getMarkdownName(file: string): string {
  return path.basename(file).replace(/\.docx$/i, ".md");
}

async function findDocxFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
  });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return findDocxFiles(fullPath);
      }

      if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".docx") &&
        !entry.name.startsWith("~$")
      ) {
        return [fullPath];
      }

      return [];
    }),
  );

  return nested.flat();
}

function createFlatFileName(inputFile: string, inputRoot: string): string {
  const relative = path.relative(inputRoot, inputFile);

  return relative
    .replace(/\.docx$/i, ".md")
    .split(path.sep)
    .join("-");
}

function buildOutputPath(
  inputFile: string,
  inputRoot: string,
  outputRoot: string,
  flat: boolean,
): string {
  if (flat) {
    return path.join(outputRoot, createFlatFileName(inputFile, inputRoot));
  }

  const relative = path.relative(inputRoot, inputFile);

  return path.join(outputRoot, relative.replace(/\.docx$/i, ".md"));
}

function buildInPlacePath(inputFile: string): string {
  return path.join(path.dirname(inputFile), getMarkdownName(inputFile));
}

function normalizePathForCollision(p: string): string {
  return path.resolve(p).toLowerCase();
}

function resolveOutputCollision(
  candidate: string,
  usedPaths: Set<string>,
  overwrite: boolean,
): string {
  let current = candidate;

  let counter = 1;

  while (true) {
    const normalized = normalizePathForCollision(current);

    const collidesInBatch = usedPaths.has(normalized);

    const collidesOnDisk = !overwrite && existsSync(current);

    if (!collidesInBatch && !collidesOnDisk) {
      return current;
    }

    const parsed = path.parse(candidate);

    current = path.join(parsed.dir, `${parsed.name}-${counter}${parsed.ext}`);

    counter++;
  }
}

async function computeOutputMap(
  inputFiles: string[],
  inputRoot: string,
  outputRoot: string | undefined,
  inPlace: boolean,
  flat: boolean,
  overwrite: boolean,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const usedPaths = new Set<string>();

  for (const inputFile of inputFiles) {
    let outputFile: string;

    if (inPlace) {
      outputFile = buildInPlacePath(inputFile);
    } else {
      if (!outputRoot) {
        throw new Error("Output root is required when not using --in-place.");
      }

      outputFile = buildOutputPath(inputFile, inputRoot, outputRoot, flat);
    }

    if (
      normalizePathForCollision(inputFile) ===
      normalizePathForCollision(outputFile)
    ) {
      throw new Error(
        `Input and output paths cannot be the same: ${inputFile}`,
      );
    }

    outputFile = resolveOutputCollision(outputFile, usedPaths, overwrite);

    usedPaths.add(normalizePathForCollision(outputFile));

    map.set(inputFile, outputFile);
  }

  return map;
}

async function processFile(
  inputPath: string,
  outputPath: string,
  overwrite: boolean,
  verbose: boolean,
): Promise<ConvertResult> {
  try {
    if (!overwrite && existsSync(outputPath)) {
      return {
        input: inputPath,
        output: outputPath,
        success: false,
        skipped: true,
      };
    }

    const buffer = await fs.readFile(inputPath);

    const markdown = await convertBufferToMarkdown(buffer);

    await fs.mkdir(path.dirname(outputPath), {
      recursive: true,
    });

    await fs.writeFile(outputPath, markdown, "utf8");

    if (verbose) {
      console.log(`✓ ${inputPath} -> ${outputPath}`);
    } else {
      console.log(`✓ ${path.basename(inputPath)}`);
    }

    return {
      input: inputPath,
      output: outputPath,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`✗ ${path.basename(inputPath)} (${message})`);

    return {
      input: inputPath,
      output: outputPath,
      success: false,
      error: message,
    };
  }
}
program
  .name("word2md")
  .description("Convert Word documents (.docx) to Markdown (.md)")
  .version("1.0.0")
  .argument("<input>", "Input .docx file or directory")
  .option("-o, --output <path>", "Output directory or markdown file")
  .option("--in-place", "Write markdown files next to source documents")
  .option("--flat", "Flatten output directory structure")
  .option("--overwrite", "Overwrite existing markdown files")
  .option("--verbose", "Show detailed conversion logs")
  .option("--concurrency <n>", "Number of files processed in parallel", "5")
  .action(async (input: string, options: CliOptions) => {
    const startTime = Date.now();

    try {
      const inputPath = path.resolve(process.cwd(), input);

      if (!existsSync(inputPath)) {
        console.error(`Input path does not exist: ${inputPath}`);
        process.exit(1);
      }

      if (options.inPlace && options.output) {
        console.error("Cannot use --in-place together with --output.");
        process.exit(1);
      }

      const stat = await fs.stat(inputPath);

      const isDirectory = stat.isDirectory();

      let filesToProcess: string[];

      if (isDirectory) {
        filesToProcess = await findDocxFiles(inputPath);

        if (filesToProcess.length === 0) {
          console.error(`No .docx files found in directory: ${inputPath}`);
          process.exit(1);
        }
      } else {
        if (!inputPath.toLowerCase().endsWith(".docx")) {
          console.error("Input file must have a .docx extension.");
          process.exit(1);
        }

        filesToProcess = [inputPath];
      }

      let outputRoot: string | undefined;

      let isOutputFile = false;

      if (options.output) {
        outputRoot = path.resolve(process.cwd(), options.output);

        if (existsSync(outputRoot)) {
          const outputStat = await fs.stat(outputRoot);

          isOutputFile = outputStat.isFile();
        } else {
          isOutputFile = path.extname(outputRoot) !== "";
        }
      } else if (!options.inPlace) {
        outputRoot = path.resolve(process.cwd(), "output");
      }

      if (isDirectory && isOutputFile) {
        console.error(
          "Cannot use a single output file when the input is a directory.",
        );
        process.exit(1);
      }

      if (
        isOutputFile &&
        outputRoot &&
        path.extname(outputRoot).toLowerCase() !== ".md"
      ) {
        console.error("Output file must have a .md extension.");
        process.exit(1);
      }

      const concurrency = Math.max(
        1,
        Number.parseInt(options.concurrency ?? "5", 10) || 5,
      );

      const inputRoot = isDirectory ? inputPath : path.dirname(inputPath);

      let outputMap: Map<string, string>;

      if (isOutputFile && outputRoot) {
        outputMap = new Map([[inputPath, outputRoot]]);
      } else {
        outputMap = await computeOutputMap(
          filesToProcess,
          inputRoot,
          outputRoot,
          !!options.inPlace,
          !!options.flat,
          !!options.overwrite,
        );
      }

      console.log(
        `Processing ${filesToProcess.length} file(s) with concurrency=${concurrency}...`,
      );

      const limit = pLimit(concurrency);

      const tasks = filesToProcess.map((file) =>
        limit(async () => {
          const outputPath = outputMap.get(file);

          if (!outputPath) {
            throw new Error(`Missing output mapping for ${file}`);
          }

          return processFile(
            file,
            outputPath,
            !!options.overwrite,
            !!options.verbose,
          );
        }),
      );

      const results = await Promise.all(tasks);

      const successCount = results.filter((r) => r.success).length;

      const skippedCount = results.filter((r) => r.skipped).length;

      const failedCount = results.filter(
        (r) => !r.success && !r.skipped,
      ).length;

      const durationMs = Date.now() - startTime;

      console.log("");
      console.log("=================================");
      console.log("Conversion Summary");
      console.log("=================================");
      console.log(`Total     : ${results.length}`);
      console.log(`Success   : ${successCount}`);
      console.log(`Skipped   : ${skippedCount}`);
      console.log(`Failed    : ${failedCount}`);
      console.log(`Duration  : ${(durationMs / 1000).toFixed(2)}s`);
      console.log("=================================");

      if (failedCount > 0) {
        process.exit(1);
      }

      console.log("\nConversion completed successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Unexpected error: ${message}`);

      process.exit(1);
    }
  });

program.parse(process.argv);
