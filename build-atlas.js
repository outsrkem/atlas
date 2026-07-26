const fs = require("fs-extra");
const { minify } = require("terser");
const csso = require("csso");
const path = require("path");

const SRC = "./src";
const DIST = "./dist";

// ============ JS 压缩 ============
async function buildJs(srcPath, distPath) {
    try {
        const raw = await fs.readFile(srcPath, "utf8");
        const result = await minify(raw, {
            mangle: { reserved: ["Atlas", "ATLAS_CDN_ROOT"] },
            compress: { drop_console: false },
        });
        await fs.outputFile(distPath, result.code);
        console.log("✅ JS ", srcPath, "→", distPath);
    } catch (error) {
        console.error(`❌ JS 压缩失败 ${srcPath}:`, error.message);
        throw error;
    }
}

// ============ CSS 压缩 ============
async function buildCss(srcPath, distPath) {
    try {
        const raw = await fs.readFile(srcPath, "utf8");
        const code = csso.minify(raw).css;
        await fs.outputFile(distPath, code);
        console.log("✅ CSS ", srcPath, "→", distPath);
    } catch (error) {
        console.error(`❌ CSS 压缩失败 ${srcPath}:`, error.message);
        throw error;
    }
}

// ============ 文件复制 ============
async function copyFile(srcPath, distPath) {
    try {
        await fs.copy(srcPath, distPath, { overwrite: true });
        console.log("📄 COPY ", srcPath, "→", distPath);
    } catch (error) {
        console.error(`❌ 复制失败 ${srcPath}:`, error.message);
        throw error;
    }
}

// ============ 清理 dist 目录 ============
async function cleanDist() {
    if (await fs.pathExists(DIST)) {
        await fs.emptyDir(DIST);
        console.log("🧹 已清理 dist 目录");
    }
}

// ============ 主流程 ============
async function run() {
    console.log("🚀 开始构建...\n");

    // 清理旧的构建产物
    await cleanDist();

    // 确保输出目录存在
    await fs.ensureDir(DIST);
    await fs.ensureDir(`${DIST}/utils`);
    await fs.ensureDir(`${DIST}/components/top-header`);

    // ============【清单全部手动写死，杜绝漏文件】============

    // 根文件
    await buildJs(`${SRC}/atlas-runtime.js`, `${DIST}/atlas-runtime.js`);

    // utils脚本
    await buildJs(`${SRC}/utils/auth-service.js`, `${DIST}/utils/auth-service.js`);
    await buildJs(`${SRC}/utils/event-bus.js`, `${DIST}/utils/event-bus.js`);
    await buildJs(`${SRC}/utils/resource-loader.js`, `${DIST}/utils/resource-loader.js`);

    // top-header组件
    await copyFile(`${SRC}/components/top-header/index.html`, `${DIST}/components/top-header/index.html`);
    await buildJs(`${SRC}/components/top-header/main.js`, `${DIST}/components/top-header/main.js`);
    await buildCss(`${SRC}/components/top-header/style.css`, `${DIST}/components/top-header/style.css`);

    console.log("\n🎉 所有资源处理完毕！");
}

// ============ 执行 ============
run().catch((e) => {
    console.error("❌ 处理失败：", e);
    process.exit(1);
});
