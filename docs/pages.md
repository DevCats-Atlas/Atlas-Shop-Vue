# Shop admin page contracts

These pages run inside AtlasCMS-Vue. AtlasShop owns their controllers, DTOs, validation and routes; this package owns rendering and Inertia forms. Shared `auth`, `adminPrefix`, `translations`, navigation and flash props follow [CMS-Vue shared props](https://github.com/DevCats-Atlas/Atlas-CMS-Vue/blob/main/docs/pages.md#shared-props).

## Built-in pages

The table lists every page and its declared props in source order. The host [documentation checks](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/tests/Frontend/docsExamples.test.mjs) compare it with `defineProps()`.

| Page | Rendered by | Props |
| --- | --- | --- |
| `Admin/Orders/Index` | AtlasShop `AdminOrderController::index()` | `title`, `moduleHandle`, `module`, `action`, `menuItem`, `availableActions`, `orders`, `filters`, `pagination`, `availableStatuses` |
| `Admin/Orders/Show` | AtlasShop `AdminOrderController::show()` | `title`, `moduleHandle`, `module`, `action`, `menuItem`, `order`, `statusHistory`, `availableStatusTransitions`, `currentStatus`, `deliveryMethods`, `paymentMethods`, `paymentTransaction` |
| `Admin/Baskets/Index` | AtlasShop `AdminBasketsController::index()` | `title`, `moduleHandle`, `module`, `action`, `menuItem`, `availableActions`, `baskets`, `filters`, `pagination` |

Sources: [order controller](https://github.com/DevCats-Atlas/Atlas-Shop/blob/main/src/Http/Controllers/Admin/Orders/AdminOrderController.php), [basket controller](https://github.com/DevCats-Atlas/Atlas-Shop/blob/main/src/Http/Controllers/Admin/Baskets/AdminBasketsController.php), and [admin DTOs](https://github.com/DevCats-Atlas/Atlas-Shop/tree/main/src/DTOs/Admin).

`module` is `{ id, title }`, `moduleHandle` is `orders` or `baskets`. `action`/`availableActions` are CMS action records; `menuItem` may be null. Lists receive `pagination: { current_page, last_page, per_page, total, from, to }`, with nullable `from`/`to` for an empty result. Status options are `{ value, label }` objects. Array props are empty arrays when no results exist.

## Routes and access

Use `adminUrl()` with relative paths and the shared configured prefix. Order URLs take `order_number`, not the numeric ID or UUID. Explicit order routes currently accept `[A-Z0-9-]+` numbers.

| Method | Relative path | Page or operation |
| --- | --- | --- |
| GET | `orders/index` | `Admin/Orders/Index` |
| GET | `orders/show/{orderNumber}` | `Admin/Orders/Show` |
| PUT | `orders/{orderNumber}/status` | Status form |
| PUT | `orders/{orderNumber}/update` | Order edit form |
| GET | `baskets/index` | `Admin/Baskets/Index` |

Routes use `web` and `admin` middleware, including session and module access checks. A guest Inertia request gets the CMS unauthorized response; a denied module gets access denied. A missing order is `404`. Updates return redirects with flash/errors, not the storefront JSON envelopes. See [AtlasCMS access](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/access.md#the-admin-middleware).

## Orders list

`filters` contains `search`, `status`, `date_from`, `date_to`, `sort_by`, `sort_dir`. Dates filter `created_at` inclusively. Search matches order number, customer name or email. Allowed sorting: `created_at`, `order_number`, `total_amount`, `status`; default `created_at desc`. The backend also accepts `page` and `per_page` (default 20). List refreshes request only `orders`, `filters`, `pagination` through Inertia.

Each `orders` row contains `id`, `order_number`, `date` (`Y-m-d H:i`), `customer_name`, `customer_email`, `status`, numeric `total_amount`, nullable `currency_code`/`currency_sign`, and ISO `created_at`. `availableStatuses` contains the order workflow statuses, not gateway transaction statuses.

## Order details

`order` uses the [Order DTO shape](https://github.com/DevCats-Atlas/Atlas-Shop/blob/main/docs/http-api.md#customer-orders), with the additional boolean `order.financial.editable` computed by the admin controller. In particular:

- Customer values are nested in `order.customer`; amounts in `order.financial`.
- `items` are saved order snapshots with flat `product_title`, `product_sku`, `product_image`, quantity and price fields. They are not live basket product objects.
- Currency and delivery/payment method objects may be null. Method options are separate `deliveryMethods`/`paymentMethods` arrays of `{ id, title }`.
- `currentStatus` is the current order status; `availableStatusTransitions` is the server's permitted next statuses.

Each `statusHistory` entry contains `id`, nullable `status_from`, `status_to`, nullable `changed_by_user_id`/`changed_by_name`, nullable `notes`/`metadata`, ISO `created_at`, and `formatted_date` (`Y-m-d H:i:s`).

`paymentTransaction` is nullable. When available, it has `provider`, `status`, numeric `amount`, `currency`, nullable `provider_transaction_id`, `description`, `processed_at`, `error_message`, and `created_at`; gateway methods can add `uuid`, `status_label` and display data. The controller resolves the stored payment-method class first and falls back to `order.payment_data` with `from_payment_data: true`. This display is not a list of every payment attempt and must not be used to decide retry eligibility.

## Status form

The page sends `{ status, notes }` through `useForm().put(adminUrl('orders/{orderNumber}/status'))`. `status` must be a valid next state; optional notes are at most 1000 characters. The request and repository validate the transition again. On success the backend redirects back with `flash.success`, and the page closes the modal and shows a toast. Invalid/stale transitions appear as `statusUpdateForm.errors.status`.

Changing status records history. It does not charge a customer or request a refund. See [financial edits and refunds](https://github.com/DevCats-Atlas/Atlas-Shop/blob/main/docs/checkout-and-payments.md#financial-edits-and-refunds).

## Order edit form

The form flattens the nested read DTO before PUT to `orders/{orderNumber}/update`:

| Request fields | Contract |
| --- | --- |
| `customer_name`, `customer_email` | Required strings, max 255; email validated |
| `customer_phone`, `customer_address` | Nullable strings; phone max 255 |
| `delivery_method_id`, `payment_method_id` | Nullable integer IDs of the corresponding method Item type |
| `delivery_data` | Nullable array/object; saved directly, without checkout's delivery-method validation |
| `subtotal`, `tax_amount`, `shipping_amount`, `discount_amount`, `total_amount` | Numeric, non-negative when supplied; repository requires non-null values and caps at 99,999,999.99 |
| `notes` | Nullable string, max 5000 |

The endpoint does not expose item edits, currency changes, payment metadata or checkout-state changes. `order.financial.editable` is true only for a `pending` order without any transaction and outside `paying`/`unknown` checkout states. When false, amount inputs and payment-method selection are disabled. The Inertia form still contains their unchanged values; the backend accepts unchanged amounts but rejects changes with errors on the affected fields.

For editable financials, the backend computes total in minor units as subtotal + tax + shipping − discount and ignores the supplied total as a source of truth. Excessive discount gives `errors.discount_amount`; locked amounts/payment method give their respective field errors. Customer, delivery details and notes can still be edited. Render errors through `orderUpdateForm.errors`, including errors returned after the page became stale.

## Dynamic delivery fields

The detail view and edit modal load `/api/shop/delivery-methods/{id}/fields`; option/search requests go to `/field-options/{fieldName}`. These are the public shop API endpoints, not admin-prefixed routes. [HTTP contracts](https://github.com/DevCats-Atlas/Atlas-Shop/blob/main/docs/http-api.md#delivery-fields) define their envelopes.

The fields response is keyed by name; the page converts it to `{ name, ...definition }` entries. Definitions include `type`, `label`, `required`, `options` and `depends_on`. Dynamic selects and search use `dependencies` JSON and `search`; the page clears dependent values when a parent changes. Search defaults to a three-character minimum (or `search_min_length`) and is debounced.

Nova Poshta has additional mapping between display text and provider references: retain `region_ref`, `city_ref`, `delivery_point_ref` and their labels. The page maps stored region references into the region selector when opening the form. A readable city label is not a substitute for its provider reference. Generalizing this behavior requires changing both the method's definitions and the page.

## Baskets list

`filters` has `search`, `date_from`, `date_to`, `sort_by`, `sort_dir`. Search matches customer name/email, session ID or basket ID. Dates filter `created_at`; allowed sort fields are `created_at`, `updated_at`, `total_amount`, `id`, default `created_at desc`. Backend pagination accepts `page`/`per_page` (default 20). Partial reloads request `baskets`, `filters`, `pagination`.

Only baskets with items are listed. Each row has `id`, nullable `user_id`/`user_name`/`user_email`/`session_id`, numeric `total_amount`, `item_count` (sum of quantities), nullable `currency_code`/`currency_sign`, ISO `created_at`/`updated_at`, and `items`. Each nested item contains `id`, `product_id`, `product_title`, nullable `product_sku`/`product_image`, `quantity`, numeric `price`/`subtotal`, and `attributes` (defaults to `[]`). Expanding a row is local UI state; there are no basket edit/delete actions here.

## Product attributes interface

`Shop/ProductAttributes` is a custom field interface, not an Inertia page. Configure `type: custom`, `interface_path: Shop/ProductAttributes`; it declares required `field` and optional `model` props. It obtains the product ID from `page.props.item.id` or the `item` URL query, and the module handle through `adminModuleHandle()`.

- GET `adminUrl('{module}/product-attributes')` with `item_id`, `field_id` returns `{ categories: [{ id, title, groups: [{ id, title, attributes: [{ id, title }] }] }], selectedAttributes: [id] }`.
- POST `adminUrl('{module}/product-attributes/toggle')` with `item_id`, `field_id`, `attribute_id`, boolean `selected` returns `{ success: true, selected }`. Send the same-origin session and CSRF token.
- Selection persists immediately as `product_attribute` relationships; it does not wait for the parent form to save and does not write through `model`.
- The product must be saved and assigned categories first. The backend verifies module membership, product/field type and the attribute's category ancestry. Missing IDs return `400` with `error`; invalid targets return `404`; access rules still apply. Failed toggles show a toast and preserve the selection.

## Extending and verifying

Host overrides use the exact Inertia page name under `resources/admin/Pages/`; they replace the package page and must keep these contracts. Reuse CMS-Vue layouts, forms, `useToast()` and translation keys from AtlasShop's `shop.*` namespace. Prefer a custom page/controller for a different workflow over modifying a shared read DTO only in Vue.

From the host run `node --test tests/Frontend/docsExamples.test.mjs` for page-table drift, `php artisan test tests/Feature/Shop/AdminOrderFinancialsTest.php` for backend financial rules, and `npm run build` for screen changes. Browser checks must cover errors, status transitions, delivery dependencies and dark mode; the page-table check verifies top-level names, not nested payload semantics or browser interaction.
