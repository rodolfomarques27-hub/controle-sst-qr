import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        "import.meta.env.VITE_APP_VERSION": JSON.stringify(process.env.npm_package_version || "1.0.6"),
        "import.meta.env.VITE_APK_VERSION": JSON.stringify("1.0.8"),
        "import.meta.env.VITE_APP_BUILD_DATE": JSON.stringify(new Date().toISOString()),
    },
    build: {
        rolldownOptions: {
            output: {
                strictExecutionOrder: true,
                codeSplitting: {
                    groups: [
                        {
                            name: "vendor-react",
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                            priority: 60,
                        },
                        {
                            name: "vendor-supabase",
                            test: /node_modules[\\/]@supabase[\\/]/,
                            priority: 50,
                        },
                        {
                            name: "vendor-icons",
                            test: /node_modules[\\/]lucide-react[\\/]/,
                            priority: 40,
                        },
                        {
                            name: "vendor-motion",
                            test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
                            priority: 35,
                        },
                        {
                            name: "vendor-pdf",
                            test: /node_modules[\\/]pdfjs-dist[\\/]/,
                            priority: 45,
                        },
                        {
                            name: "vendor-jspdf",
                            test: /node_modules[\\/]jspdf[\\/]/,
                            priority: 46,
                        },
                        {
                            name: "vendor-html2canvas",
                            test: /node_modules[\\/]html2canvas[\\/]/,
                            priority: 45,
                        },
                        {
                            name: "vendor-export-support",
                            test: /node_modules[\\/](canvg|dompurify|fflate)[\\/]/,
                            priority: 44,
                        },
                        {
                            name: "vendor-ocr",
                            test: /node_modules[\\/](tesseract\.js|tesseract\.js-core|bmp-js|idb-keyval|zlibjs)[\\/]/,
                            priority: 43,
                        },
                        {
                            name: "vendor-map",
                            test: /node_modules[\\/](@react-leaflet|react-leaflet|leaflet)[\\/]/,
                            priority: 42,
                        },
                        {
                            name: "vendor-qrcode",
                            test: /node_modules[\\/]qrcode\.react[\\/]/,
                            priority: 25,
                        },
                        {
                            name: "vendor-misc",
                            test: /node_modules[\\/]/,
                            priority: 10,
                        },
                    ],
                },
            },
        },
    },
});
