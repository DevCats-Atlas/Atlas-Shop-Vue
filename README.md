# AtlasShop-Vue

Vue.js frontend package for AtlasShop e-commerce functionality. Provides Vue components, Inertia.js pages, and frontend assets for shop features.

## Prerequisites

**⚠️ Important:** AtlasShop-Vue requires AtlasCMS-Vue to be installed first. The admin panel functionality depends on AtlasCMS-Vue.

Make sure you have installed and configured AtlasCMS-Vue before proceeding with AtlasShop-Vue installation.

See [AtlasCMS-Vue README](../AtlasCMS-Vue/README.md) for installation instructions.

## Installation

### Option 1: npm Package (Production)

```bash
npm install @devcats/atlas-shop-vue
```

### Option 2: Local Development

```bash
npm install ./packages/AtlasShop-Vue
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "@devcats/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
  }
}
```

Then run:

```bash
npm install
```

### Option 3: Environment Variable (CI/CD)

```bash
export ATLASSHOPVUE_PATH=/path/to/atlas-shop-vue
```

## Vite Configuration

AtlasShop-Vue automatically integrates with your existing Vite configuration. If you've already set up AtlasCMS-Vue, no additional configuration is needed!

### Automatic Discovery

The `loadAllPackages()` function from AtlasCMS-Vue automatically discovers all `@devcats/*-vue` packages in your `package.json`, including AtlasShop-Vue.

### Step 1: Ensure Both Packages are in `package.json`

Make sure both packages are listed in your `package.json` dependencies:

```json
{
  "dependencies": {
    "@devcats/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
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
const utils = await import('@devcats/atlas-cms-vue/vite-utils.mjs');
const { loadAllPackages } = utils;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// Load all packages automatically from package.json
// This will discover both AtlasCMS-Vue and AtlasShop-Vue
const { inputs, aliases } = await loadAllPackages(__dirname);

export default defineConfig(({ mode }) => {
    // ... rest of your config
});
```

**That's it!** AtlasShop-Vue will be automatically discovered and loaded.

## How It Works

1. **Automatic Discovery**: The `loadAllPackages()` function reads your `package.json` and finds all `@devcats/*-vue` packages, including AtlasShop-Vue.

2. **Package Resolution**: AtlasShop-Vue is resolved using this priority:
   - Environment variable (`ATLASSHOPVUE_PATH`)
   - Path from `package.json` (for `file:` protocol)
   - npm package in `node_modules`

3. **Config Loading**: AtlasShop-Vue's `vite.config.mjs` file is automatically loaded, which defines:
   - Resource files (CSS, JS) for shop functionality
   - Path aliases for imports

4. **Automatic Integration**: All resources and aliases are automatically added to your Vite configuration.

## Package Structure

```
AtlasShop-Vue/
├── vite.config.mjs          # Package Vite configuration
├── resources/
│   ├── css/
│   │   └── shop.css        # Shop styles
│   ├── js/
│   │   └── shop.js         # Shop JavaScript
│   └── admin/
│       └── Pages/          # Admin pages (orders, baskets, etc.)
└── package.json
```

## Available Aliases

After installation, the following aliases are available in your Vue components:

- `@atlasshop/admin` - Points to `resources/admin` directory
- `@atlasshop/frontend` - Points to `resources` directory

### Usage in Components

```vue
<script setup>
// Admin pages
import OrdersIndex from '@atlasshop/admin/Pages/Admin/Orders/Index.vue';

// Frontend components
import ShopCart from '@atlasshop/frontend/components/Cart.vue';
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
    resources: [
        { type: 'css', file: 'resources/css/shop.css', context: 'frontend' },
        { type: 'js', file: 'resources/js/shop.js', context: 'frontend' },
    ],
    
    // Path aliases for this package
    aliases: {
        '@atlasshop/admin': path.resolve(__dirname, 'resources/admin'),
        '@atlasshop/frontend': path.resolve(__dirname, 'resources'),
    },
};
```

## Features

- **E-commerce Admin Pages**: Order management, basket management, and more
- **Frontend Shop Components**: Shopping cart, checkout, product display
- **TypeScript Support**: Type-safe shop functionality
- **Inertia.js Integration**: Seamless integration with Laravel backend

## Troubleshooting

### Package Not Found

If you see an error that AtlasShop-Vue is not found:

1. **Check `package.json`**: Ensure `@devcats/atlas-shop-vue` is listed in dependencies
2. **Check AtlasCMS-Vue**: Verify AtlasCMS-Vue is installed first (required)
3. **Run `npm install`**: Make sure dependencies are installed
4. **Check path**: If using `file:` protocol, verify the path is correct
5. **Environment variable**: You can override the path with `ATLASSHOPVUE_PATH`

### Resources Not Loading

If shop resources aren't loading:

1. **Check `vite.config.mjs`**: Ensure the package has a valid `vite.config.mjs` file
2. **Verify file paths**: Check that resource files exist at the specified paths
3. **Check Vite build**: Run `npm run dev` and check for errors in the console
4. **Verify AtlasCMS-Vue**: Ensure AtlasCMS-Vue is properly installed and configured

### Aliases Not Working

If aliases aren't resolving:

1. **Check import path**: Ensure you're using the correct alias (e.g., `@atlasshop/frontend` not `@/atlasshop`)
2. **Rebuild**: Try running `npm run build` or restarting the dev server
3. **Check alias definition**: Verify aliases are correctly defined in the package's `vite.config.mjs`
4. **Verify loadAllPackages**: Ensure `loadAllPackages()` is being called in your root `vite.config.js`

### Admin Pages Not Found

If admin pages (Orders, Baskets) are not found:

1. **Check page-resolver.js**: Verify the page resolver in AtlasCMS-Vue can find AtlasShop-Vue pages
2. **Verify package discovery**: Ensure AtlasShop-Vue is being discovered by `loadAllPackages()`
3. **Check file structure**: Verify admin pages exist in `resources/admin/Pages/`

## Development

### Local Development Setup

For local development, use the `file:` protocol in `package.json`:

```json
{
  "dependencies": {
    "@devcats/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
  }
}
```

This creates symlinks in `node_modules`, so changes to the package are immediately reflected.

### Building

The package resources are automatically included when you build your main project:

```bash
npm run build
```

## Dependencies

AtlasShop-Vue requires:

- **AtlasCMS-Vue** (required) - For admin panel functionality
- Node.js 18+
- npm 9+
- Vite 5+
- Laravel Vite Plugin 2+
- Vue 3+
- TypeScript 5+ (for TypeScript files)

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

