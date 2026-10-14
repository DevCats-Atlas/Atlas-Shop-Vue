# AtlasShop-Vue

Independent npm repository: `@devcats-atlas/atlas-shop-vue`. Provides shop admin Inertia pages for orders and baskets. Public demo shop Blade/CSS/JS belongs to AtlasShop.

## Work rules

- Read `README.md` for integration context; actual resources and aliases are defined in `vite.config.mjs`.
- Use Vue Composition API, `<script setup>`, JavaScript, and existing Inertia form/navigation patterns.
- Reuse AtlasCMS-Vue layouts/components/helpers through `@admin` and `@`. This package's alias is `@atlasshop/admin`.
- Match props and status/filter/update routes to AtlasShop controllers and DTOs. Dynamic delivery fields/options use shop API endpoints; retain cascading dependencies and search behavior.
- Use translation keys from AtlasShop's `resources/lang/{locale}/shop.php` via the shared translation helper. Maintain dark-mode support.
- Package `resources` in Vite config is empty: pages are discovered by AtlasCMS-Vue, without their own entry point.
- Pass `loadAllPackages()` pageRoots into the consumer's `atlasPages()` plugin. Pages must use the selected shop directory, including `ATLAS_SHOP_VUE_PATH` overrides; verify host overrides and exact Inertia names against the CMS registry contract.
- For packaging changes, verify `npm pack --dry-run --ignore-scripts --json` includes `vite.config.mjs` and admin pages, then install the tarball in a clean consumer and check `loadAllPackages()` resolves `@atlasshop/admin` inside the installed package.

Admin URLs use `adminUrl()` from `@/utils/adminUrl`, backed by the shared Inertia `adminPrefix` prop. Pass paths relative to the admin prefix. Use `adminModuleHandle()` for module extraction; do not hardcode `/admin` in links, form endpoints, or path parsing.

## Verification and Git

Run `npm run build` from the Atlas CMS host root. For screen changes verify the affected list/detail form, errors, filters, and dynamic delivery fields when a running host is available. A separate clone needs a consumer with AtlasCMS-Vue and AtlasShop backend contracts.

Inspect this repository's Git status separately. Commit/push only on explicit request.
