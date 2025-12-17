<script setup>
import { computed, ref } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useTranslation } from '@admin/js/utils/useTranslation';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Baskets',
    },
    moduleHandle: {
        type: String,
        default: 'baskets',
    },
    module: {
        type: Object,
        required: true,
    },
    action: {
        type: Object,
        required: true,
    },
    menuItem: {
        type: Object,
        default: null,
    },
    availableActions: {
        type: Array,
        default: () => [],
    },
    baskets: {
        type: Array,
        default: () => [],
    },
    filters: {
        type: Object,
        default: () => ({
            search: '',
            date_from: '',
            date_to: '',
            sort_by: 'created_at',
            sort_dir: 'desc',
        }),
    },
    pagination: {
        type: Object,
        default: null,
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);

// Expanded basket rows
const expandedBaskets = ref(new Set());

const toggleBasket = (basketId) => {
    if (expandedBaskets.value.has(basketId)) {
        expandedBaskets.value.delete(basketId);
    } else {
        expandedBaskets.value.add(basketId);
    }
};

// Search and filter form
const filterForm = useForm({
    search: props.filters.search || '',
    date_from: props.filters.date_from || '',
    date_to: props.filters.date_to || '',
    sort_by: props.filters.sort_by || 'created_at',
    sort_dir: props.filters.sort_dir || 'desc',
});

const applyFilters = () => {
    filterForm.get(baseUrl.value, {
        preserveState: true,
        preserveScroll: true,
        only: ['baskets', 'filters', 'pagination'],
    });
};

const clearFilters = () => {
    filterForm.reset();
    filterForm.sort_by = 'created_at';
    filterForm.sort_dir = 'desc';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['baskets', 'filters', 'pagination'],
    });
};

const hasActiveFilters = computed(() => {
    return filterForm.search || filterForm.date_from || filterForm.date_to;
});

// Format currency
const formatCurrency = (amount, currencySign, currencyCode) => {
    if (!amount) return '-';
    const sign = currencySign || '';
    const code = currencyCode || '';
    return sign ? `${sign}${amount.toFixed(2)}` : `${amount.toFixed(2)} ${code}`.trim();
};

// Format date
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Pagination links with filters
const getPaginationUrl = (page) => {
    const params = new URLSearchParams();
    if (filterForm.search) params.append('search', filterForm.search);
    if (filterForm.date_from) params.append('date_from', filterForm.date_from);
    if (filterForm.date_to) params.append('date_to', filterForm.date_to);
    if (filterForm.sort_by) params.append('sort_by', filterForm.sort_by);
    if (filterForm.sort_dir) params.append('sort_dir', filterForm.sort_dir);
    params.append('page', page);
    return `${baseUrl.value}?${params.toString()}`;
};
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">            
            <div class="mx-auto space-y-6 max-w-full px-4 sm:px-6 lg:px-10">
                <section class="section">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('shop.common.module') }}</p>
                            <h1 class="heading-1">
                                {{ module.title }}
                                <span class="text-gray-400 text-base font-normal">/ {{ action.title }}</span>
                            </h1>
                        </div>
                    </div>
                </section>

                <!-- Search and Filter Form -->
                <section class="section">
                    <h2 class="section-heading">{{ t('shop.baskets.search_filter') }}</h2>
                    <form @submit.prevent="applyFilters" class="space-y-4">
                        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <!-- Search -->
                            <div>
                                <label class="form-label">{{ t('shop.baskets.search') }}</label>
                                <input
                                    v-model="filterForm.search"
                                    type="text"
                                    class="form-input"
                                    :placeholder="t('shop.baskets.search_placeholder')"
                                />
                            </div>

                            <!-- Date From -->
                            <div>
                                <label class="form-label">{{ t('shop.baskets.date_from') }}</label>
                                <input
                                    v-model="filterForm.date_from"
                                    type="date"
                                    class="form-input"
                                />
                            </div>

                            <!-- Date To -->
                            <div>
                                <label class="form-label">{{ t('shop.baskets.date_to') }}</label>
                                <input
                                    v-model="filterForm.date_to"
                                    type="date"
                                    class="form-input"
                                />
                            </div>

                            <!-- Sort By -->
                            <div>
                                <label class="form-label">{{ t('shop.baskets.sort_by') }}</label>
                                <select v-model="filterForm.sort_by" class="form-select">
                                    <option value="created_at">{{ t('shop.baskets.sort_date_created') }}</option>
                                    <option value="updated_at">{{ t('shop.baskets.sort_date_updated') }}</option>
                                    <option value="total_amount">{{ t('shop.baskets.sort_total_amount') }}</option>
                                    <option value="id">{{ t('shop.baskets.sort_basket_id') }}</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <button type="submit" class="btn btn-primary" :disabled="filterForm.processing">
                                {{ filterForm.processing ? t('shop.baskets.applying') : t('shop.baskets.apply_filters') }}
                            </button>
                            <button
                                v-if="hasActiveFilters"
                                type="button"
                                class="btn btn-outline"
                                @click="clearFilters"
                            >
                                {{ t('shop.baskets.clear_filters') }}
                            </button>
                        </div>
                    </form>
                </section>

                <!-- Baskets Table -->
                <section class="section">
                    <div class="flex items-center justify-between">
                        <h2 class="section-heading">{{ t('shop.baskets.title') }}</h2>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th class="table-cell w-8"></th>
                                    <th class="table-header w-0">{{ t('shop.baskets.id') }}</th>
                                    <th class="table-header">{{ t('shop.baskets.customer') }}</th>
                                    <th class="table-header">{{ t('shop.baskets.items') }}</th>
                                    <th class="table-cell text-right font-semibold text-gray-600 dark:text-gray-300">{{ t('shop.baskets.total') }}</th>
                                    <th class="table-header">{{ t('shop.baskets.created') }}</th>
                                    <th class="table-header">{{ t('shop.baskets.updated') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <template v-for="basket in baskets" :key="basket.id">
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer" @click="toggleBasket(basket.id)">
                                        <td class="table-cell">
                                            <button
                                                class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                @click.stop="toggleBasket(basket.id)"
                                            >
                                                <svg
                                                    class="w-4 h-4 transition-transform"
                                                    :class="{ 'rotate-90': expandedBaskets.has(basket.id) }"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </td>
                                        <td class="table-cell">
                                            <span class="font-mono text-xs text-gray-600 dark:text-gray-400">#{{ basket.id }}</span>
                                        </td>
                                        <td class="table-cell">
                                            <div v-if="basket.user_name || basket.user_email" class="text-sm">
                                                <div class="font-medium text-gray-900 dark:text-white">{{ basket.user_name || '-' }}</div>
                                                <div class="text-gray-500 dark:text-gray-400 text-xs">{{ basket.user_email || '' }}</div>
                                            </div>
                                            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                                                <div class="font-mono text-xs">{{ t('shop.baskets.guest') }}</div>
                                                <div class="text-xs">{{ basket.session_id?.substring(0, 8) }}...</div>
                                            </div>
                                        </td>
                                        <td class="table-cell text-sm text-gray-900 dark:text-white">
                                            {{ basket.item_count }} {{ basket.item_count === 1 ? t('shop.baskets.item') : t('shop.baskets.items') }}
                                        </td>
                                        <td class="table-cell text-right text-sm font-medium text-gray-900 dark:text-white">
                                            {{ formatCurrency(basket.total_amount, basket.currency_sign, basket.currency_code) }}
                                        </td>
                                        <td class="table-cell text-sm text-gray-600 dark:text-gray-400">
                                            {{ formatDate(basket.created_at) }}
                                        </td>
                                        <td class="table-cell text-sm text-gray-600 dark:text-gray-400">
                                            {{ formatDate(basket.updated_at) }}
                                        </td>
                                    </tr>
                                    <!-- Expanded row with product details -->
                                    <tr v-if="expandedBaskets.has(basket.id)" class="bg-gray-50 dark:bg-gray-900/60">
                                        <td colspan="7" class="px-4 py-4">
                                            <div class="space-y-3">
                                                <h3 class="font-semibold text-gray-900 dark:text-white text-sm mb-3">{{ t('shop.baskets.products_in_basket') }}</h3>
                                                <div class="grid gap-3">
                                                    <div
                                                        v-for="item in basket.items"
                                                        :key="item.id"
                                                        class="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <div v-if="item.product_image" class="flex-shrink-0">
                                                            <img
                                                                :src="item.product_image"
                                                                :alt="item.product_title"
                                                                class="w-16 h-16 object-cover rounded"
                                                            />
                                                        </div>
                                                        <div v-else class="flex-shrink-0 w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                            </svg>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <div class="font-medium text-gray-900 dark:text-white">{{ item.product_title }}</div>
                                                            <div v-if="item.product_sku" class="text-xs text-gray-500 dark:text-gray-400">
                                                                {{ t('shop.baskets.sku') }}: {{ item.product_sku }}
                                                            </div>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="text-sm text-gray-600 dark:text-gray-400">
                                                                {{ item.quantity }} × {{ formatCurrency(item.price, basket.currency_sign, basket.currency_code) }}
                                                            </div>
                                                            <div class="font-medium text-gray-900 dark:text-white">
                                                                {{ formatCurrency(item.subtotal, basket.currency_sign, basket.currency_code) }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <div class="flex justify-end">
                                                        <div class="text-right">
                                                            <div class="text-sm text-gray-600 dark:text-gray-400">{{ t('shop.baskets.total_label') }}</div>
                                                            <div class="section-heading">
                                                                {{ formatCurrency(basket.total_amount, basket.currency_sign, basket.currency_code) }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                                <tr v-if="baskets.length === 0">
                                    <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        {{ hasActiveFilters ? t('shop.baskets.no_baskets_filtered') : t('shop.baskets.no_baskets') }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div v-if="pagination && pagination.total > 0" class="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                        <div class="flex flex-1 justify-between sm:hidden">
                            <Link
                                v-if="pagination.current_page > 1"
                                :href="getPaginationUrl(pagination.current_page - 1)"
                                class="btn-text"
                            >
                                {{ t('shop.common.previous') }}
                            </Link>
                            <span v-else class="text-gray-400">Previous</span>
                            
                            <Link
                                v-if="pagination.current_page < pagination.last_page"
                                :href="getPaginationUrl(pagination.current_page + 1)"
                                class="btn-text"
                            >
                                {{ t('shop.common.next') }}
                            </Link>
                            <span v-else class="text-gray-400">Next</span>
                        </div>
                        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p class="text-sm text-gray-700 dark:text-gray-300">
                                    {{ t('shop.common.showing') }}
                                    <span class="font-medium">{{ ((pagination.current_page - 1) * pagination.per_page) + 1 }}</span>
                                    {{ t('shop.common.to') }}
                                    <span class="font-medium">{{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }}</span>
                                    {{ t('shop.common.of') }}
                                    <span class="font-medium">{{ pagination.total }}</span>
                                    {{ t('shop.common.results') }}
                                </p>
                            </div>
                            <div class="flex gap-1">
                                <Link
                                    v-for="page in Array.from({ length: pagination.last_page }, (_, i) => i + 1)"
                                    :key="page"
                                    :href="getPaginationUrl(page)"
                                    class="px-3 py-2 text-sm font-semibold rounded-md"
                                    :class="{
                                        'bg-blue-600 text-white': page === pagination.current_page,
                                        'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700': page !== pagination.current_page,
                                    }"
                                >
                                    {{ page }}
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </AdminLayout>
</template>

