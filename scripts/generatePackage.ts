import { mkdir, readdir, writeFile, cp } from "node:fs/promises";
import { join } from "node:path";
import PackageJson from "@npmcli/package-json";

type TypesDir = {
  name: string;
  camelCaseName: string;
};

const GENERATED_PACKAGE_DIR = "generatedPackage";
const DIST_DIR = join(GENERATED_PACKAGE_DIR, "dist");

async function generateBarrelFile(typesDirs: TypesDir[]) {
  console.log("📦 Writing barrel file.");
  const barrelFile = join(DIST_DIR, "index.d.ts");
  const barrelFileContent = typesDirs.map(
    (dir) => `export * as ${dir.camelCaseName} from "./${dir.name}/index";`
  );
  await writeFile(barrelFile, barrelFileContent.join("\n"));
}

async function createAliasPackageJsonFiles(typesDirs: TypesDir[]) {
  for (const dir of typesDirs) {
    try {
      const aliasName = `@grafana/plugin-types/${dir.name}`;
      console.log(`📦 Writing alias package.json for ${aliasName}.`);
      const pkgJsonPath = join("generatedPackage", dir.name);
      await mkdir(pkgJsonPath, { recursive: true });
      const pkgJson = await PackageJson.create(pkgJsonPath, {
        data: {
          name: aliasName,
          types: `../dist/${dir.name}/index.d.ts`,
        },
      });
      await pkgJson.save();
    } catch (error) {
      console.error(`Error generating package.json for ${dir.name}`, error);
    }
  }
}

async function createPackageJsonFile(typesDirs: TypesDir[]) {
  console.log("📦 Writing root package.json.");
  const rootPkgJson = await PackageJson.load("./");
  const exports = typesDirs.reduce(
    (acc, dir) => {
      acc[`./${dir.name}`] = {
        types: `./dist/${dir.name}/index.d.ts`,
      };
      return acc;
    },
    {
      ".": {
        types: "./dist/index.d.ts",
      },
      "./package.json": "./package.json",
    } as Record<string, { types: string } | string>
  );

  const files = [
    "dist",
    ...typesDirs.map((dir) => dir.name),
    "package.json",
    "LICENSE",
    "README.md",
  ];

  const pkgJson = await PackageJson.create("generatedPackage", {
    data: {
      name: "@grafana/plugin-types",
      version: rootPkgJson.content.version!,
      description: rootPkgJson.content.description!,
      license: rootPkgJson.content.license!,
      author: rootPkgJson.content.author!,
      types: "index.d.ts",
      typesVersions: {
        ">=4.0": {
          "*": ["dist/*"],
          "package.json": ["package.json"],
        },
      },
      sideEffects: false,
      exports,
      files,
    },
  });
  await pkgJson.save();
}

async function generatePackage(typesDirs: TypesDir[]) {
  await mkdir(DIST_DIR, { recursive: true });
  await generateBarrelFile(typesDirs);
  await copyTypesFiles();
  await createAliasPackageJsonFiles(typesDirs);
  await createPackageJsonFile(typesDirs);
}

async function copyTypesFiles() {
  const source = "types";
  console.log(`📁 Copying ${source} to ${DIST_DIR}.`);
  await cp(source, DIST_DIR, { recursive: true });
}

function kebabToCamel(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

(async () => {
  const startTime = Date.now().valueOf();
  console.log("⚡️ Starting");
  const typesDirs = (await readdir("types", { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      name: dirent.name,
      camelCaseName: kebabToCamel(dirent.name),
    }));
  await generatePackage(typesDirs);
  const endTime = Date.now().valueOf();
  console.log(`🎉 Done (${endTime - startTime}ms)`);
  process.exit(0);
})();
