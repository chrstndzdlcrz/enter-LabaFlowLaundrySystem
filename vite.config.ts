import { defineConfig, PluginOption } from "vite";
import { enterDevPlugin, enterProdPlugin } from 'vite-plugin-enter-dev';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    // The template default injects a stylesheet with twenty font families into
    // the built page. That request blocks the first paint, which is what leaves
    // the site sitting on "loading" on a phone connection, so the two families
    // the design system really uses are declared in index.html instead.
    ...enterProdPlugin({ injectGoogleFonts: false }),
  ];
  if (mode === 'development') {
    plugins.push(...enterDevPlugin());
  }
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins.filter(Boolean) as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: '/',
    build: {
      outDir: 'dist',
      // A manifest lets the build be audited for what each entry actually loads.
      manifest: true,
    }
  };
});