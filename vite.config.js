import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";

const laravelUrl = "http://127.0.0.1:8000";

function isViteRequest(url) {
    return (
        url.startsWith("/@") ||
        url.startsWith("/node_modules") ||
        url.startsWith("/resources") ||
        url.startsWith("/__vite")
    );
}

export default defineConfig({
    plugins: [
        laravel({
            input: "resources/js/app.jsx",
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: "localhost",
        port: 5173,
        strictPort: true,
        open: "/login",
        proxy: {
            "/": {
                target: laravelUrl,
                changeOrigin: true,
                bypass(req) {
                    if (isViteRequest(req.url ?? "")) {
                        return req.url;
                    }
                },
            },
        },
    },
});
