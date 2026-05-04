// vite.config.js
import { defineConfig } from "file:///dev-server/node_modules/.bun/vite@5.4.19+dbdc735346b46d86/node_modules/vite/dist/node/index.js";
import react from "file:///dev-server/node_modules/.bun/@vitejs+plugin-react-swc@3.11.0+6e6d78a945eb7e62/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///dev-server/node_modules/.bun/lovable-tagger@1.1.13+6e6d78a945eb7e62/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/dev-server";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  esbuild: {
    // Strip console.log/debug/info in production — keep warn/error for diagnostics
    drop: mode === "production" ? ["console", "debugger"] : []
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    target: "esnext",
    chunkSizeWarningLimit: 2e3,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/react-router")) {
            return "router-vendor";
          }
          if (id.includes("node_modules/@radix-ui/")) {
            return "ui-vendor";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "query-vendor";
          }
          if (id.includes("node_modules/@supabase/")) {
            return "supabase-vendor";
          }
          if (id.includes("node_modules/framer-motion/")) {
            return "motion-vendor";
          }
          if (id.includes("node_modules/date-fns/")) {
            return "date-vendor";
          }
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-")) {
            return "charts-vendor";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "icons-vendor";
          }
          if (id.includes("node_modules/zod/")) {
            return "zod-vendor";
          }
          if (id.includes("node_modules/react-hook-form/") || id.includes("node_modules/@hookform/")) {
            return "form-vendor";
          }
          if (id.includes("node_modules/sonner/")) {
            return "toast-vendor";
          }
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) {
            return "export-vendor";
          }
          if (id.includes("node_modules/@dnd-kit/")) {
            return "dnd-vendor";
          }
        }
      }
    }
  },
  server: {
    port: 8080,
    host: "::"
  },
  preview: {
    port: 4173,
    host: true
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvZGV2LXNlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2Rldi1zZXJ2ZXIvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2Rldi1zZXJ2ZXIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbi8qKlxuICogVml0ZSBDb25maWd1cmF0aW9uIC0gUHJvZHVjdGlvbiBSZWFkeVxuICpcbiAqIEBzZWUgaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHJlYWN0KCksXG4gICAgICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIGVzYnVpbGQ6IHtcbiAgICAgICAgLy8gU3RyaXAgY29uc29sZS5sb2cvZGVidWcvaW5mbyBpbiBwcm9kdWN0aW9uIFx1MjAxNCBrZWVwIHdhcm4vZXJyb3IgZm9yIGRpYWdub3N0aWNzXG4gICAgICAgIGRyb3A6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IFsnY29uc29sZScsICdkZWJ1Z2dlciddIDogW10sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAgICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAgICAgbWluaWZ5OiAnZXNidWlsZCcsXG4gICAgICAgIHRhcmdldDogJ2VzbmV4dCcsXG4gICAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMjAwMCxcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvcmUgUmVhY3RcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QvJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1kb20vJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAncmVhY3QtdmVuZG9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXInKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdyb3V0ZXItdmVuZG9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBVSSBwcmltaXRpdmVzIChSYWRpeClcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHJhZGl4LXVpLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3VpLXZlbmRvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gRGF0YSBmZXRjaGluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AdGFuc3RhY2svJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAncXVlcnktdmVuZG9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBTdXBhYmFzZSBjbGllbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHN1cGFiYXNlLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3N1cGFiYXNlLXZlbmRvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQW5pbWF0aW9uIGxpYnJhcnkgXHUyMDE0IGxhenkgbG9hZGVkIHdpdGggbW9zdCBwYWdlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9mcmFtZXItbW90aW9uLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ21vdGlvbi12ZW5kb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIERhdGUgdXRpbGl0aWVzXG4gICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2RhdGUtZm5zLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2RhdGUtdmVuZG9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBDaGFydHMgLSBpc29sYXRlIHJlY2hhcnRzIGludG8gaXRzIG93biBjaHVuayAob25seSBsb2FkZWQgYnkgZGFzaGJvYXJkIHBhZ2VzKVxuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWNoYXJ0cy8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2QzLScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2NoYXJ0cy12ZW5kb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEljb25zIFx1MjAxNCBzcGxpdCBpbnRvIHNlcGFyYXRlIGNodW5rIHRvIGFsbG93IHRyZWUgc2hha2luZyBwZXItcm91dGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvbHVjaWRlLXJlYWN0LycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2ljb25zLXZlbmRvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy96b2QvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnem9kLXZlbmRvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9ybSBoYW5kbGluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1ob29rLWZvcm0vJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AaG9va2Zvcm0vJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnZm9ybS12ZW5kb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFNvbm5lciArIHRvYXN0XG4gICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3Nvbm5lci8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICd0b2FzdC12ZW5kb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFBERi9FeHBvcnQgbGlicyBcdTIwMTQgb25seSBsb2FkZWQgb24gZGVtYW5kXG4gICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2pzcGRmJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9odG1sMmNhbnZhcycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2V4cG9ydC12ZW5kb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIERuRCBcdTIwMTQgb25seSB1c2VkIGluIGtpdCBidWlsZGVyIC8ga2FuYmFuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BkbmQta2l0LycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2RuZC12ZW5kb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgcG9ydDogODA4MCxcbiAgICAgICAgaG9zdDogXCI6OlwiLFxuICAgIH0sXG4gICAgcHJldmlldzoge1xuICAgICAgICBwb3J0OiA0MTczLFxuICAgICAgICBob3N0OiB0cnVlLFxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtTixTQUFTLG9CQUFvQjtBQUNoUCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBU3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDdkMsU0FBUztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsRUFDOUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDeEM7QUFBQSxFQUNKO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQSxJQUVMLE1BQU0sU0FBUyxlQUFlLENBQUMsV0FBVyxVQUFVLElBQUksQ0FBQztBQUFBLEVBQzdEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDSCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUix1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDWCxRQUFRO0FBQUEsUUFDSixhQUFhLElBQUk7QUFFYixjQUFJLEdBQUcsU0FBUyxxQkFBcUIsS0FBSyxHQUFHLFNBQVMseUJBQXlCLEdBQUc7QUFDOUUsbUJBQU87QUFBQSxVQUNYO0FBQ0EsY0FBSSxHQUFHLFNBQVMsMkJBQTJCLEdBQUc7QUFDMUMsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMseUJBQXlCLEdBQUc7QUFDeEMsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMseUJBQXlCLEdBQUc7QUFDeEMsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMseUJBQXlCLEdBQUc7QUFDeEMsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMsNkJBQTZCLEdBQUc7QUFDNUMsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEdBQUc7QUFDdkMsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEtBQUssR0FBRyxTQUFTLGtCQUFrQixHQUFHO0FBQzFFLG1CQUFPO0FBQUEsVUFDWDtBQUVBLGNBQUksR0FBRyxTQUFTLDRCQUE0QixHQUFHO0FBQzNDLG1CQUFPO0FBQUEsVUFDWDtBQUVBLGNBQUksR0FBRyxTQUFTLG1CQUFtQixHQUFHO0FBQ2xDLG1CQUFPO0FBQUEsVUFDWDtBQUVBLGNBQUksR0FBRyxTQUFTLCtCQUErQixLQUFLLEdBQUcsU0FBUyx5QkFBeUIsR0FBRztBQUN4RixtQkFBTztBQUFBLFVBQ1g7QUFFQSxjQUFJLEdBQUcsU0FBUyxzQkFBc0IsR0FBRztBQUNyQyxtQkFBTztBQUFBLFVBQ1g7QUFFQSxjQUFJLEdBQUcsU0FBUyxvQkFBb0IsS0FBSyxHQUFHLFNBQVMsMEJBQTBCLEdBQUc7QUFDOUUsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEdBQUc7QUFDdkMsbUJBQU87QUFBQSxVQUNYO0FBQUEsUUFDSjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNWO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDVixTQUFTLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLEVBQ3REO0FBQ0osRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
