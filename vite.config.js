import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";

const laravelUrl = "http://localhost:8000/login";

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
        open: true,
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
