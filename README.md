# AtlasShop-Vue

Admin Inertia pages for AtlasShop: orders and baskets. The pages run inside the AtlasCMS-Vue admin (layout, components, translations, page resolution); the backend controllers and the public demo shop belong to [AtlasShop](https://github.com/DevCats-Atlas/Atlas-Shop/blob/main/README.md).

| Page | Contents |
| --- | --- |
| `Admin/Orders/Index` | Search by number, customer or email; status and date filters; sortable, paginated list |
| `Admin/Orders/Show` | Customer, item snapshots, status timeline and status change, editable delivery data with dynamic fields from `/api/shop`, payment transaction details |
| `Admin/Baskets/Index` | Guest and user baskets with expandable items, date filter, sorting |

## Requirements

AtlasCMS-Vue installed in the same consumer, and the AtlasShop backend (its `orders`/`baskets` modules and `/api/shop` routes). The package has no dependencies, build scripts or Node engine of its own; the consumer's Vite toolchain builds the pages — see [AtlasCMS-Vue requirements](https://github.com/DevCats-Atlas/Atlas-CMS-Vue/blob/main/README.md#requirements).

## Installation

Install it the same way as AtlasCMS-Vue — local `file:` source, Git dependency pinned to a commit, or an `npm pack` archive; the manifest is `private`, so there is no registry release. See [AtlasCMS-Vue installation](https://github.com/DevCats-Atlas/Atlas-CMS-Vue/blob/main/README.md#installation). Both packages must be listed in the consumer `package.json`:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
    "@devcats-atlas/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
  }
}
```

No extra Vite configuration is needed: AtlasCMS-Vue's `loadAllPackages()` discovers `@devcats-atlas/*-vue` dependencies, loads this package's `vite.config.mjs` (alias `@atlasshop/admin` → `resources/admin`, no entry points) and returns its page root, which the consumer passes to `atlasPages()`. Resolution order: `ATLAS_SHOP_VUE_PATH` (exported before Vite starts) → `file:` path → `node_modules`.

Host pages in `resources/admin/Pages/` override package pages with the same Inertia name — see [AtlasCMS-Vue page resolution](https://github.com/DevCats-Atlas/Atlas-CMS-Vue/blob/main/README.md#page-resolution).

## Development

Pages use Vue 3 `<script setup>` in plain JavaScript, AtlasCMS-Vue `AdminLayout`, `ModalDialog`, `useTranslation` and `useToast`, translation keys `shop.orders.*` / `shop.baskets.*` from AtlasShop's `resources/lang/{locale}/shop.php`, and `adminUrl()` for admin links. Build from the host root with `npm run build`.

The npm archive contains `vite.config.mjs` and `resources/**`; check it with `npm pack --dry-run --ignore-scripts --json`. In Atlas CMS, `node --test tests/Frontend/*.test.mjs` packs, installs and resolves the archive in a temporary consumer.

The package declares no license. Repository: [Atlas-Shop-Vue](https://github.com/DevCats-Atlas/Atlas-Shop-Vue).
