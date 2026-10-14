# AtlasShop-Vue

Vue.js admin panel package for AtlasShop e-commerce functionality. Provides Vue components and Inertia.js pages for the admin interface (orders, baskets management).

**Note:** Frontend demo resources (JavaScript/CSS) are located in the [AtlasShop](../AtlasShop/README.md) package, not in this package.

## Prerequisites

**⚠️ Important:** AtlasShop-Vue requires AtlasCMS-Vue to be installed first. The admin panel functionality depends on AtlasCMS-Vue.

Make sure you have installed and configured AtlasCMS-Vue before proceeding with AtlasShop-Vue installation.

See [AtlasCMS-Vue README](../AtlasCMS-Vue/README.md) for installation instructions.

## Installation

The current manifest has `private: true`: [npm refuses to publish it](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#private). Supported delivery for this checkout is local source, Git, or an npm archive. A registry release needs a separately prepared publishable manifest and release process.

Run installation commands from the Laravel/Vite consumer root. AtlasCMS-Vue's third-party dependencies still need registry access or a populated npm cache. AtlasShop-Vue also needs AtlasCMS-Vue installed in that consumer.

### Local Sources

In My Atlas CMS, populate the submodules first:

```bash
git submodule update --init --recursive
```

For another consumer, clone the package repositories into the matching `packages/` directories. Then declare the local paths in the consumer's `package.json`:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats-atlas/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
  }
}
```

```bash
npm install
```

### Git Dependency

Use [npm's Git dependency syntax](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#git-urls-as-dependencies), replacing `<commit-sha>` with the full commit SHA of the tested revision:

```bash
npm install '@devcats-atlas/atlas-shop-vue@git+https://github.com/DevCats-Atlas/Atlas-Shop-Vue.git#<commit-sha>'
```

For AtlasShop-Vue, install AtlasCMS-Vue by the same method or from local sources first. Keep the dependency entries and `package-lock.json` in the consumer repository; with an existing lock, use `npm ci` in CI. The Git URL requires access to the repository. A commit SHA pins the Atlas package; the lock pins resolved third-party dependencies.

### npm Archive

From this package's source directory, create an archive in an existing output directory:

```bash
npm pack --ignore-scripts --pack-destination /absolute/path/to/artifacts
```

Use the filename returned by `npm pack` (currently `devcats-atlas-atlas-shop-vue-1.0.0.tgz`). Install it from the consumer root:

```bash
npm install /absolute/path/to/artifacts/devcats-atlas-atlas-shop-vue-1.0.0.tgz
```

Keep the archive available at the path recorded in the consumer dependency and lock, including in CI. AtlasShop-Vue consumers need archives or source dependencies for both Vue packages. Packing works with `private: true`; publishing is a separate operation.

### Environment Path Override

After installing and declaring the dependency, export the variable before starting Vite:

```bash
export ATLAS_SHOP_VUE_PATH=/absolute/path/to/AtlasShop-Vue
npm run build
```

`loadAllPackages()` reads this variable from `process.env`; the documented Vite config calls it before `loadEnv()`, so a value only in `.env` is not loaded by that call. Relative overrides resolve from the consumer root. The selected directory must contain `resources/` and a working `vite.config.mjs`.

An override changes config/resource/page resolution; it does not install dependencies or add a package to discovery. Keep the package declared in `package.json` and AtlasCMS-Vue installed in `node_modules` so `@devcats-atlas/atlas-cms-vue/vite-utils.mjs` can be imported. Override precedence is environment → local `file:` directory → installed `node_modules`. A missing override directory falls back to the remaining locations. With the `atlasPages()` plugin below, pages are loaded from the selected package's `resources/admin/Pages/`, including external override directories.

## Vite Configuration

AtlasShop-Vue automatically integrates with your existing Vite configuration. If you've already set up AtlasCMS-Vue, no additional configuration is needed!

### Automatic Discovery

The `loadAllPackages()` function from AtlasCMS-Vue automatically discovers `@devcats/*-vue` and `@devcats-atlas/*-vue` dependencies in your `package.json`, including AtlasShop-Vue.

### Step 1: Ensure Both Packages are in `package.json`

Keep both packages listed in the consumer dependencies. For local sources use the example below; retain the Git or archive specs if you chose those installation methods:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats-atlas/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
  }
}
```

### Step 2: Verify Your `vite.config.js`

Your `vite.config.js` should already be set up from AtlasCMS-Vue installation:

```javascript
import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';

// Import AtlasCMS-Vue utilities (handles all @devcats/*-vue packages)
const utils = await import('@devcats-atlas/atlas-cms-vue/vite-utils.mjs');
const { loadAllPackages, atlasPages } = utils;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// Load all packages automatically from package.json
// This will discover both AtlasCMS-Vue and AtlasShop-Vue
const { inputs, aliases, pageRoots } = await loadAllPackages(__dirname);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            atlasPages({ projectRoot: __dirname, pageRoots }),
            laravel({ input: inputs, refresh: true }),
            vue(),
            tailwindcss(),
        ],
        resolve: { alias: aliases },
        server: {
            host: env.VITE_DEV_HOST || 'localhost',
            port: parsePort(env.VITE_DEV_PORT, 5174),
        },
    };
});
```

AtlasShop-Vue resources/aliases and admin page roots now use the same selected package directory. Keep the `atlasPages()` plugin registered in both build and dev.

## How It Works

1. **Automatic Discovery**: The `loadAllPackages()` function reads your `package.json` and finds `@devcats/*-vue` and `@devcats-atlas/*-vue` dependencies, including AtlasShop-Vue.

2. **Package Resolution**: AtlasShop-Vue is resolved using this priority:
   - Environment variable (`ATLAS_SHOP_VUE_PATH`)
   - Path from `package.json` (for `file:` protocol)
   - npm package in `node_modules`

3. **Config Loading**: AtlasShop-Vue's `vite.config.mjs` file is automatically loaded, which defines:
   - Path aliases for admin component imports
   - (No frontend resources - they're in the AtlasShop package)

4. **Page Integration**: Pass the returned `pageRoots` to `atlasPages()` to register the selected package's Inertia pages. Host `resources/admin/Pages/` wins, followed by CMS pages and other declared Vue dependencies. See [AtlasCMS-Vue page resolution](../AtlasCMS-Vue/README.md#page-resolution) for collisions and explicit Composer roots.

## Package Structure

The npm archive includes `vite.config.mjs` and `resources/**/*`. The config is required for `loadAllPackages()` to register `@atlasshop/admin` when consuming an archive or Git dependency.

To inspect the archive contents, run from this package directory:

```bash
npm pack --dry-run --ignore-scripts --json
```

In the My Atlas CMS integration host, `node --test tests/Frontend/packagePackaging.test.mjs` also packs and installs the archive in a temporary consumer and verifies config loading. These checks work locally without registry access.

```
AtlasShop-Vue/
├── vite.config.mjs          # Package Vite configuration
├── resources/
│   └── admin/
│       └── Pages/          # Admin pages (orders, baskets, etc.)
└── package.json
```

**Note:** Frontend demo resources (JavaScript/CSS) are in the [AtlasShop](../AtlasShop/README.md) package at `packages/AtlasShop/resources/js/` and `packages/AtlasShop/resources/css/`.

## Available Aliases

After installation, the following aliases are available in your Vue components:

- `@atlasshop/admin` - Points to `resources/admin` directory

### Usage in Components

```vue
<script setup>
// Admin pages
import OrdersIndex from '@atlasshop/admin/Pages/Admin/Orders/Index.vue';
import BasketsIndex from '@atlasshop/admin/Pages/Admin/Baskets/Index.vue';
</script>
```

## Package Configuration (`vite.config.mjs`)

AtlasShop-Vue includes a `vite.config.mjs` file that exports its configuration:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    // Resource files to include in Vite build
    // (No frontend resources - they're in the AtlasShop package)
    resources: [],
    
    // Path aliases for this package
    aliases: {
        '@atlasshop/admin': path.resolve(__dirname, 'resources/admin'),
    },
};
```

**Note:** Frontend demo resources (JavaScript/CSS) are configured in the [AtlasShop](../AtlasShop/README.md) package, not here.

## Features

- **E-commerce Admin Pages**: Order management, basket management, and more
- **Inertia.js Integration**: Seamless integration with Laravel backend
- **Vue 3 Components**: Modern Vue.js components for admin interface

**Note:** Frontend demo shop functionality (JavaScript library, CSS) is provided by the [AtlasShop](../AtlasShop/README.md) package.

## Troubleshooting

### Package Not Found

If you see an error that AtlasShop-Vue is not found:

1. **Check `package.json`**: Ensure `@devcats-atlas/atlas-shop-vue` is listed in dependencies
2. **Check AtlasCMS-Vue**: Verify AtlasCMS-Vue is installed first (required)
3. **Run `npm install`**: Make sure dependencies are installed
4. **Check path**: If using `file:` protocol, verify the path is correct
5. **Environment variable**: You can override the path with `ATLAS_SHOP_VUE_PATH`

### Resources Not Loading

If admin pages aren't loading:

1. **Check `vite.config.mjs`**: Ensure the package has a valid `vite.config.mjs` file
2. **Check Vite build**: Run `npm run dev` and check for errors in the console
3. **Verify AtlasCMS-Vue**: Ensure AtlasCMS-Vue is properly installed and configured
4. **Frontend resources**: If you need frontend shop resources (JS/CSS), they're in the [AtlasShop](../AtlasShop/README.md) package

### Aliases Not Working

If aliases aren't resolving:

1. **Check import path**: Ensure you're using the correct alias (e.g., `@atlasshop/admin` not `@/atlasshop`)
2. **Rebuild**: Try running `npm run build` or restarting the dev server
3. **Check alias definition**: Verify aliases are correctly defined in the package's `vite.config.mjs`
4. **Verify loadAllPackages**: Ensure `loadAllPackages()` is being called in your root `vite.config.js`

### Admin Pages Not Found

If admin pages (Orders, Baskets) are not found:

1. **Check page-resolver.js**: Verify the page resolver in AtlasCMS-Vue can find AtlasShop-Vue pages
2. **Verify page registration**: Ensure `loadAllPackages()` returns the selected shop page root and `atlasPages({ projectRoot: __dirname, pageRoots })` is in the consumer Vite plugins
3. **Check file structure**: Verify admin pages exist in `resources/admin/Pages/`

## Development

### Local Development Setup

For local development, use the `file:` protocol in `package.json`:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats-atlas/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
  }
}
```

This creates symlinks in `node_modules`, so changes to the package are immediately reflected.

### Building

The package resources are automatically included when you build your main project:

```bash
npm run build
```

## Dependencies and Consumer Toolchain

AtlasShop-Vue requires AtlasCMS-Vue for layouts, shared components, translations, and page resolution, plus the AtlasShop backend for page props/routes. Its own npm manifest declares no dependencies, standalone build/test scripts, or Node engine. The consumer installs AtlasCMS-Vue and its Vue/Inertia dependencies explicitly.

Shop admin pages are Vue components using plain JavaScript. TypeScript is used by the separate AtlasShop browser library; it is not a requirement for compiling these admin pages.

The current My Atlas CMS host requires **Node >=22.12.0** and uses Vite `^8.3.4`, `@vitejs/plugin-vue` `^6.0.10`, Laravel Vite plugin `^3.2.0`, and Tailwind Vite plugin `^4.3.3`. Its Laravel Vite plugin requires Vite 8. AtlasCMS-Vue supplies Vue `^3.5.44` and `@inertiajs/vue3` `^3.9.1`. These are the tested consumer versions; this package has no separate Vite/Node minimum in its manifest.

Use npm from the selected compatible Node installation and the consumer lock with `npm ci`. Run `npm run build` from the host root. In My Atlas CMS, `node --test tests/Frontend/*.test.mjs` also verifies packaging and package helpers. A separate consumer must satisfy its selected plugins' Node engines and peer dependencies.

## Integration with AtlasCMS-Vue

AtlasShop-Vue is designed to work seamlessly with AtlasCMS-Vue:

- **Shared Admin Layout**: Uses admin layout from AtlasCMS-Vue
- **Shared Components**: Can use components from AtlasCMS-Vue
- **Unified Navigation**: Integrates with CMS navigation
- **Page Resolution**: Admin pages are resolved through AtlasCMS-Vue's page resolver

## License

[Your License Here]

## Support

For issues and questions, please [create an issue](https://github.com/your-org/atlas-shop-vue/issues).

## Related Packages

- [AtlasCMS-Vue](../AtlasCMS-Vue/README.md) - Required dependency
- [AtlasShop](../AtlasShop/README.md) - Backend PHP package
- [AtlasCMS](../AtlasCMS/README.md) - CMS backend package

