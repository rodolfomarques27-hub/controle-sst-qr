import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";
import { basename } from "node:path";

export default defineConfig(({ mode }) => {
    const dataBuild = new Date();
    const commitBuild = String(process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 8);
    const idBuild = commitBuild || dataBuild.toISOString().replace(/\D/g, "").slice(0, 14);
    const ambienteBuild = process.env.VERCEL_ENV || (mode === "production" ? "production" : "development");
    const origemBuild = process.env.VITE_BUILD_SOURCE
        || process.env.VERCEL_GIT_COMMIT_REF
        || process.env.VERCEL_PROJECT_NAME
        || basename(process.cwd());

    return {
        plugins: [react(), tailwindcss()],
        define: {
            "import.meta.env.VITE_APP_VERSION": JSON.stringify(process.env.npm_package_version || "1.0.8"),
            "import.meta.env.VITE_APK_VERSION": JSON.stringify("1.0.8"),
            "import.meta.env.VITE_APP_BUILD_DATE": JSON.stringify(dataBuild.toISOString()),
            "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(idBuild),
            "import.meta.env.VITE_APP_BUILD_ENV": JSON.stringify(ambienteBuild),
            "import.meta.env.VITE_APP_BUILD_SOURCE": JSON.stringify(origemBuild),
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
                            name: "vendor-excel-xlsx",
                            test: /node_modules[\\/]exceljs[\\/]lib[\\/]xlsx[\\/]/,
                            priority: 41,
                        },
                        {
                            name: "vendor-excel-core",
                            test: /node_modules[\\/]exceljs[\\/]/,
                            priority: 40,
                        },
                        {
                            name: "vendor-excel-support",
                            test: /node_modules[\\/](archiver|dayjs|fast-csv|jszip|readable-stream|saxes|tmp|unzipper|uuid)[\\/]/,
                            priority: 39,
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
    };
});
