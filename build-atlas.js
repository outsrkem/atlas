const fs = require("fs-extra");
const { minify } = require("terser");
const csso = require("csso");
const path = require("path");

const SRC = "./src";
const DIST = "./dist";
const CDN_BASE_FLAG = "__CDN_BASE_DEFAULT__";

function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach((arg) => {
        if (arg.startsWith("--")) {
            const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
            if (match) {
                args[match[1]] = match[2] !== undefined ? match[2] : true;
            }
        }
    });
    return args;
}

const args = parseArgs();

if (args.cdn_base === "") {
    console.error("Error: --cdn_base cannot be an empty string");
    console.error("Usage:");
    console.error("  No param    : npm run build  (use default)");
    console.error("  With value  : npm run build -- --cdn_base=https://cdn.example.com");
    process.exit(1);
}

const CDN_BASE = args.cdn_base === undefined ? CDN_BASE_FLAG : args.cdn_base;

console.log(`CDN_BASE: ${CDN_BASE === CDN_BASE_FLAG ? "(use default)" : CDN_BASE}`);

// ============ Compress JS ============
async function compressJS(content, filePath) {
    try {
        const result = await minify(content, {
            mangle: { reserved: ["Atlas", "ATLAS_CDN_ROOT"] },
            compress: { drop_console: false },
        });
        console.log(`  JS compressed: ${path.basename(filePath)}`);
        return result.code;
    } catch (err) {
        console.error(`  JS compress failed: ${path.basename(filePath)}`, err.message);
        return content;
    }
}

// ============ Compress CSS ============
async function compressCSS(content, filePath) {
    try {
        const result = csso.minify(content);
        console.log(`  CSS compressed: ${path.basename(filePath)}`);
        return result.css;
    } catch (err) {
        console.error(`  CSS compress failed: ${path.basename(filePath)}`, err.message);
        return content;
    }
}

// ============ Process single file ============
async function processFile(srcPath, distPath) {
    let content = await fs.readFile(srcPath, "utf8");

    // Replace CDN_BASE placeholder
    if (content.includes("{{CDN_BASE}}")) {
        content = content.replace(/\{\{CDN_BASE\}\}/g, CDN_BASE);
    }

    const ext = path.extname(srcPath);
    let output = content;

    if (ext === ".js") {
        output = await compressJS(content, srcPath);
    } else if (ext === ".css") {
        output = await compressCSS(content, srcPath);
    }

    await fs.outputFile(distPath, output);
}

// ============ Walk directory ============
async function walkDir(srcDir, distDir) {
    await fs.ensureDir(distDir);
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const distPath = path.join(distDir, entry.name);

        // Skip excluded
        const exclude = [".git", "node_modules", ".DS_Store", "dist", ".gitkeep"];
        if (exclude.includes(entry.name)) continue;

        if (entry.isDirectory()) {
            await walkDir(srcPath, distPath);
        } else {
            const ext = path.extname(entry.name);
            if (ext === ".js" || ext === ".css") {
                await processFile(srcPath, distPath);
            } else {
                await fs.copy(srcPath, distPath, { overwrite: true });
                console.log(`  Copied: ${entry.name}`);
            }
        }
    }
}

// ============ Main ============
async function build() {
    console.log("Building...\n");

    if (await fs.pathExists(DIST)) {
        await fs.emptyDir(DIST);
        console.log("Clean dist\n");
    }

    await walkDir(SRC, DIST);

    console.log("\nBuild complete");
    const display = CDN_BASE === CDN_BASE_FLAG ? "(default)" : `"${CDN_BASE}"`;
    console.log(`CDN_BASE: ${display}`);
}

build().catch((e) => {
    console.error("Build failed:", e);
    process.exit(1);
});
