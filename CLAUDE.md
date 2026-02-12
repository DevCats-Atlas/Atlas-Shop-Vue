# CLAUDE.md — AtlasShop-Vue Package

Vue.js admin panel pages for AtlasShop e-commerce: order management, basket management, and dynamic delivery/payment method forms.

## Overview

This is a **frontend-only** package — no PHP, no build step, no composables of its own. It provides Inertia.js page components that are auto-discovered by AtlasCMS-Vue's page resolver. The demo shop frontend (Blade templates, CSS, JS) lives in the AtlasShop package, not here.

## Dependencies

- **AtlasCMS-Vue** — provides `AdminLayout`, `ModalDialog`, `useTranslation`, `useToast`, and the page resolver
- **@inertiajs/vue3** — `useForm()`, `router`, `Head`, `Link`
- **Vue 3** — Composition API with `<script setup>`

## Directory Layout

```
resources/
└── admin/
    └── Pages/
        └── Admin/
            ├── Baskets/
            │   └── Index.vue       # Basket list with expandable item details
            └── Orders/
                ├── Index.vue       # Order list with filters (search, status, dates, sorting)
                └── Show.vue        # Order detail view with status history, edit form, delivery/payment fields
```

## Page Components

### Orders/Index.vue

Order list page with comprehensive filtering:
- Search by order number, customer name, email
- Filter by status, date range
- Sortable columns (order number, date, total, status)
- Pagination with filter preservation
- Status badge display

### Orders/Show.vue

Order detail and edit page:
- Customer info, order items with product snapshots
- Status update with history timeline
- Editable delivery data with **dynamic delivery method fields** (loaded via `/api/shop/` endpoints)
- Cascading selects for delivery (region → city → delivery point)
- Search autocomplete for cities
- Payment transaction details display
- Modal dialogs for status changes

### Baskets/Index.vue

Basket management page:
- List of active baskets (guest and registered user)
- Expandable rows showing basket items with quantities and prices
- Filter by date, sort options

## Vite Configuration

`vite.config.mjs` exports package config auto-loaded by the root project via `loadAllPackages()`:
- **Alias:** `@atlasshop/admin` → `resources/admin`
- **Resources:** Empty array (no frontend entry points — demo shop resources are in AtlasShop package)

## Conventions

- Vue 3 Composition API with `<script setup>` — no Options API
- Inertia.js for all server communication — `useForm()` for forms, `router.get/post/put` for navigation
- Tailwind CSS utility classes with dark mode support (`dark:` variants)
- All text uses translation keys via `useTranslation()` — keys follow `shop.orders.*`, `shop.baskets.*` pattern
- Layouts imported from AtlasCMS-Vue: `@admin/Layouts/AdminLayout.vue`
- Shared components from AtlasCMS-Vue: `@/components/ModalDialog.vue`
- Props follow module convention: `title`, `moduleHandle`, `module`, `action`, `menuItem`, plus page-specific data

## Common Patterns

**Filtering with Inertia:**
```js
const filterForm = useForm({ search: '', status: '', ... });
const applyFilters = () => {
    filterForm.get(route, { preserveState: true, preserveScroll: true });
};
```

**Dynamic delivery method fields:**
```js
// Fetch field definitions from API
const response = await fetch(`/api/shop/delivery-methods/${methodId}/fields`);
// Render cascading selects with dependency resolution
```

**Status update with modal:**
```js
const statusForm = useForm({ status: '', notes: '' });
statusForm.put(`/admin/module/orders/${order.id}/status`, { onSuccess: () => modalOpen.value = false });
```

**Page auto-discovery:**
Pages at `Pages/Admin/Orders/Index.vue` are automatically resolved for the `orders` module by AtlasCMS-Vue's page resolver — no manual route registration needed.
