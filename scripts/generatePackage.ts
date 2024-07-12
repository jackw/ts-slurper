import { access, constants, mkdir, readdir, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";
import { extract } from "tar";
import { EntryPointConfig, generateDtsBundle } from "dts-bundle-generator";
import pluginMeta from "../pluginMetadata.json" assert { type: "json" };
import { join, resolve } from "node:path";

const downloadAndExtractRepo = async (
  repo: string,
  exportPath: string,
  pathFilter: string
) => {
  await pipeline(
    await downloadTarStream(`https://codeload.github.com/${repo}/tar.gz/main`),
    extract({
      cwd: exportPath,
      strip: pathFilter.split("/").length,
      filter: (path) => path.startsWith(pathFilter),
    })
  );
};

const downloadTarStream = async (url: string) => {
  console.log("Downloading github tar...", url);
  const res = await fetch(url);
  if (!res.body) {
    throw new Error(`Failed to download: ${url}`);
  }

  return Readable.fromWeb(res.body as ReadableStream);
};

const generateBarrelFile = async () => {
  const barrelFile = join("src", "index.ts");
  const barrelFileContent = (await readdir("src", { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map(
      (dirent) =>
        `export * as ${kebabToCamel(dirent.name)} from "./${dirent.name}";`
    );
  await writeFile(barrelFile, barrelFileContent.join("\n"));
};

const generatePackage = async () => {
  const startTime = Date.now().valueOf();
  console.log("⚡️ Starting");
  for (const plugin of pluginMeta) {
    try {
      const { pluginId, repo, types } = plugin;
      const exportPath = `./src/${pluginId}`;
      const pathExists = await directoryExists(exportPath);
      if (!pathExists) {
        await mkdir(exportPath, { recursive: true });
      }
      const tarName = `${repo.split("/")[1]}-main`;
      const pathFilter = join(tarName, types);

      await downloadAndExtractRepo(repo, exportPath, pathFilter);
    } catch (err) {
      throw new Error(`Failed to generate package: ${err}`);
    }
  }
  await generateBarrelFile();
  await mkdir("dist", { recursive: true });
  await generateTypes();

  const endTime = Date.now().valueOf();
  console.log(`🎉 Done (${endTime - startTime}ms)`);
};

function kebabToCamel(str) {
  return str.replace(/-./g, (m) => m.toUpperCase()[1]);
}

const generateTypes = async () => {
  const entryPoints: EntryPointConfig[] = [
    {
      filePath: "src/index.ts",
      libraries: {
        inlinedLibraries: ["@grafana/ui"],
      },
      output: {
        exportReferencedTypes: false,
      },
    },
  ];

  const options = {
    preferredConfigPath: resolve(__dirname, "../tsconfig.json"),
  };

  const dts = generateDtsBundle(entryPoints, options);
  const cleanedDts = cleanDTS(dts);
  await writeFile("dist/index.d.ts", cleanedDts);
};

function cleanDTS(dtsContent: string[]) {
  let dtsString = dtsContent.join("\n");
  dtsString = dtsString.replace("export {};", "");
  return dtsString.trim() + "\n";
}

const directoryExists = async (path: string) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

(async () => {
  await generatePackage();
  process.exit(0);
})();
