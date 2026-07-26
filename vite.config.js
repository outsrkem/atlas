import { defineConfig } from "vite";
export default defineConfig({
    root: ".",
    build: {
        minify: false, // 外部脚本统一处理静态资源，vite不再额外干预
    },
    server: {
        host: "0.0.0.0",
        port: 9090,
        cors: true,
        proxy: {
            "/api/uias": {
                target: "https://182.92.98.233:33860",
                changeOrigin: true,
                secure: false,
            },
            "/authui": {
                target: "https://182.92.98.233:33860",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
