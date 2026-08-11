// Assembles the runtime payload the Electron shell ships and spawns:
//
//   desktop-resources/
//     worker/worker.js                    – bun-bundled omp worker (single file)
//     worker/package.json
//     worker/node_modules/@oh-my-pi/pi-natives/          (native loader)
//     worker/node_modules/@oh-my-pi/pi-natives-<tag>/    (platform addon)
//     bun/bun.exe                        – Windows Bun runtime (release builds)
//     ui/                                – built static UI
//
// Usage:
//   bun run scripts/desktop-bundle.ts             # win32-x64 release payload
//   bun run scripts/desktop-bundle.ts --linux     # linux-x64 natives (local verification)
//   bun run scripts/desktop-bundle.ts --skip-bun  # keep an existing bun.exe
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = join(import.meta.dir, "..");
const out = join(root, "desktop-resources");
const args = new Set(process.argv.slice(2));
const useLinux = args.has("--linux");
const skipBun = args.has("--skip-bun");

function run(cmd: string[], cwd = root): void {
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function runOut(cmd: string[], cwd = root): string {
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "pipe" });
  if (res.status !== 0) throw new Error(`${cmd.join(" ")} failed with ${res.status}`);
  return res.stdout.toString().trim();
}

/** Version of the natives packages the installed SDK pins (from the workspace install). */
function nativesVersion(): string {
  const bunDir = join(root, "node_modules", ".bun");
  for (const entry of readdirSync(bunDir)) {
    if (!entry.startsWith("@oh-my-pi+pi-natives@")) continue;
    const pkgPath = join(bunDir, entry, "node_modules", "@oh-my-pi", "pi-natives", "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
    return pkg.version;
  }
  throw new Error("could not find installed @oh-my-pi/pi-natives under node_modules/.bun");
}

function findFile(dir: string, name: string): string {
  for (const entry of readdirSync(dir, { recursive: true }) as string[]) {
    if (entry.endsWith(`/${name}`) || entry === name) return join(dir, entry);
  }
  throw new Error(`could not find ${name} under ${dir}`);
}

rmSync(out, { recursive: true, force: true });
const tmp = mkdtempSync(join(tmpdir(), "omp-desktop-"));
const platformTag = useLinux ? "linux-x64" : "win32-x64";
const nativesDir = join(out, "worker", "node_modules", "@oh-my-pi");
const ver = nativesVersion();

// 1. UI build ---------------------------------------------------------------
console.log("[desktop-bundle] building UI…");
run(["bun", "run", "--filter", "@omp/ui", "build"]);

// 2. Bundle the worker -------------------------------------------------------
console.log("[desktop-bundle] bundling worker…");
mkdirSync(join(out, "worker"), { recursive: true });
run([
  "bun",
  "build",
  join("packages", "worker", "src", "index.ts"),
  "--target=bun",
  "--outdir",
  join(out, "worker"),
  "--entry-naming",
  "worker.js",
  "--external",
  "@oh-my-pi/pi-natives",
  "--external",
  "omp-legacy-pi-modules",
]);
writeFileSync(
  join(out, "worker", "package.json"),
  JSON.stringify({ name: "omp-worker", private: true, version: "0.1.0", type: "module" }, null, 2),
);

// 3. Native addon packages ----------------------------------------------------
console.log(`[desktop-bundle] installing natives (${platformTag}@${ver})…`);
mkdirSync(nativesDir, { recursive: true });
const nativesPkgs: Record<string, string> = {
  "pi-natives": `@oh-my-pi/pi-natives@${ver}`,
  [`pi-natives-${platformTag}`]: `@oh-my-pi/pi-natives-${platformTag}@${ver}`,
};
for (const [shortName, spec] of Object.entries(nativesPkgs)) {
  const dest = join(nativesDir, shortName);
  if (useLinux) {
    const src = join(
      root,
      "node_modules",
      ".bun",
      `@oh-my-pi+${shortName}@${ver}`,
      "node_modules",
      "@oh-my-pi",
      shortName,
    );
    cpSync(src, dest, { recursive: true });
  } else {
    const packTmp = mkdtempSync(join(tmp, "pack-"));
    const res = spawnSync("npm", ["pack", spec, "--pack-destination", packTmp], { cwd: root, stdio: "inherit" });
    if (res.status !== 0) process.exit(res.status ?? 1);
    const tarball = readdirSync(packTmp).find((f) => f.endsWith(".tgz"));
    if (!tarball) throw new Error(`npm pack produced no tarball for ${spec}`);
    mkdirSync(dest, { recursive: true });
    run(["tar", "-xzf", join(packTmp, tarball), "-C", dest, "--strip-components=1"]);
    rmSync(packTmp, { recursive: true, force: true });
  }
  console.log(`  ✓ ${shortName}`);
}

// 4. Windows Bun runtime ------------------------------------------------------
if (!useLinux && !skipBun) {
  const bunVer = (Bun as { version: string }).version;
  const dest = join(out, "bun");
  mkdirSync(dest, { recursive: true });
  const zip = join(tmp, "bun-windows-x64.zip");
  console.log(`[desktop-bundle] downloading bun-windows-x64 v${bunVer}…`);
  run(["curl", "-fsSL", `https://github.com/oven-sh/bun/releases/download/bun-v${bunVer}/bun-windows-x64.zip`, "-o", zip]);
  const unz = join(tmp, "bunzip");
  mkdirSync(unz, { recursive: true });
  run(["unzip", "-q", "-o", zip, "-d", unz]);
  cpSync(findFile(unz, "bun.exe"), join(dest, "bun.exe"));
  console.log("  ✓ bun.exe");
}

// 5. Static UI -----------------------------------------------------------------
console.log("[desktop-bundle] copying UI…");
cpSync(join(root, "dist"), join(out, "ui"), { recursive: true });

rmSync(tmp, { recursive: true, force: true });
const size = runOut(["du", "-sh", out]);
console.log(`[desktop-bundle] done — payload at desktop-resources/ (${size})`);
