import { type Dirent } from "node:fs";
import { mkdir, readdir, writeFile, cp } from "node:fs/promises";
import { join } from "node:path";
import PackageJson from "@npmcli/package-json";

async function generateBarrelFile(typesDirs: Dirent[]) {
  const barrelFile = join("generatedPackage", "dist", "index.ts");
  const barrelFileContent = typesDirs.map(
    (dirent) =>
      `export * as ${kebabToCamel(dirent.name)} from "./${
        dirent.name
      }/index.d";`
  );
  await writeFile(barrelFile, barrelFileContent.join("\n"));
}

async function createAliasPackageJsonFiles(typesDirs: Dirent[]) {
  for (const dir of typesDirs) {
    try {
      console.log(`📦 Writing package.json for ${dir.name}`);
      const pkgJsonPath = join("generatedPackage", dir.name);
      await mkdir(pkgJsonPath, { recursive: true });
      const pkgJson = await PackageJson.create(pkgJsonPath, {
        data: {
          name: `@grafana/${dir.name}`,
          types: `../dist/${dir.name}/index.d.ts`,
        },
      });
      await pkgJson.save();
    } catch (error) {
      console.error(`Error generating package.json for ${dir.name}`, error);
    }
  }
}

async function createPackageJsonFile(typesDirs: Dirent[]) {
  const pkgJson = await PackageJson.load("./");
  pkgJson.update({
    dependecies: {},
  });
  pkgJson.path = join("generatedPackage", "package.json");
  pkgJson.save();
  console.log(pkgJson.content);
}

async function generatePackage(typesDirs: Dirent[]) {
  const startTime = Date.now().valueOf();
  console.log("⚡️ Starting");
  await mkdir(join("generatedPackage", "dist"), { recursive: true });
  await generateBarrelFile(typesDirs);
  await copyTypesFiles();
  await createAliasPackageJsonFiles(typesDirs);
  await createPackageJsonFile(typesDirs);

  const endTime = Date.now().valueOf();
  console.log(`🎉 Done (${endTime - startTime}ms)`);
}

function kebabToCamel(str: string) {
  return str.replace(/-./g, (m) => m.toUpperCase()[1]);
}

async function copyTypesFiles() {
  const source = join(process.cwd(), "types");
  const destination = join(process.cwd(), "generatedPackage", "dist");
  console.log(`📁 Copying ${source} to ${destination}`);
  await cp(source, destination, { recursive: true });
}

(async () => {
  const typesDirs = (await readdir("types", { withFileTypes: true })).filter(
    (dirent) => dirent.isDirectory()
  );
  await generatePackage(typesDirs);
  process.exit(0);
})();
