<script setup>
import { computed, ref } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useTranslation } from '@admin/js/utils/useTranslation';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Orders',
    },
    moduleHandle: {
        type: String,
        default: 'orders',
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
    orders: {
        type: Array,
        default: () => [],
    },
    filters: {
        type: Object,
        default: () => ({
            search: '',
            status: '',
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
    availableStatuses: {
        type: Array,
        default: () => [],
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);

// Search and filter form
const filterForm = useForm({
    search: props.filters.search || '',
    status: props.filters.status || '',
    date_from: props.filters.date_from || '',
    date_to: props.filters.date_to || '',
    sort_by: props.filters.sort_by || 'created_at',
    sort_dir: props.filters.sort_dir || 'desc',
});

const applyFilters = () => {
    filterForm.get(baseUrl.value, {
        preserveState: true,
        preserveScroll: true,
        only: ['orders', 'filters', 'pagination'],
    });
};

const clearFilters = () => {
    filterForm.reset();
    filterForm.sort_by = 'created_at';
    filterForm.sort_dir = 'desc';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['orders', 'filters', 'pagination'],
    });
};

const hasActiveFilters = computed(() => {
    return filterForm.search || filterForm.status || filterForm.date_from || filterForm.date_to;
});

// Status badge color
const getStatusBadgeColor = (status) => {
    const colors = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
};

// Format currency
const formatCurrency = (amount, currencySign, currencyCode) => {
    if (!amount) return '-';
    const sign = currencySign || '';
    const code = currencyCode || '';
    return sign ? `${sign}${amount.toFixed(2)}` : `${amount.toFixed(2)} ${code}`.trim();
};

// Pagination links with filters
const getPaginationUrl = (page) => {
    const params = new URLSearchParams();
    if (filterForm.search) params.append('search', filterForm.search);
    if (filterForm.status) params.append('status', filterForm.status);
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
                    <h2 class="section-heading">{{ t('shop.orders.search_filter') }}</h2>
                    <form @submit.prevent="applyFilters" class="space-y-4">
                        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <!-- Search -->
                            <div>
                                <label class="form-label">{{ t('shop.orders.search') }}</label>
                                <input
                                    v-model="filterForm.search"
                                    type="text"
                                    class="form-input"
                                    :placeholder="t('shop.orders.search_placeholder')"
                                />
                            </div>

                            <!-- Status Filter -->
                            <div>
                                <label class="form-label">{{ t('shop.orders.status_filter') }}</label>
                                <select v-model="filterForm.status" class="form-select">
                                    <option value="">{{ t('shop.orders.all_statuses') }}</option>
                                    <option v-for="status in availableStatuses" :key="status.value" :value="status.value">
                                        {{ status.label }}
                                    </option>
                                </select>
                            </div>

                            <!-- Date From -->
                            <div>
                                <label class="form-label">{{ t('shop.orders.date_from') }}</label>
                                <input
                                    v-model="filterForm.date_from"
                                    type="date"
                                    class="form-input"
                                />
                            </div>

                            <!-- Date To -->
                            <div>
                                <label class="form-label">{{ t('shop.orders.date_to') }}</label>
                                <input
                                    v-model="filterForm.date_to"
                                    type="date"
                                    class="form-input"
                                />
                            </div>

                            <!-- Sort By -->
                            <div>
                                <label class="form-label">{{ t('shop.orders.sort_by') }}</label>
                                <select v-model="filterForm.sort_by" class="form-select">
                                    <option value="created_at">{{ t('shop.orders.sort_date') }}</option>
                                    <option value="order_number">{{ t('shop.orders.sort_order_number') }}</option>
                                    <option value="total_amount">{{ t('shop.orders.sort_total') }}</option>
                                    <option value="status">{{ t('shop.orders.sort_status') }}</option>
                                </select>
                            </div>

                            <!-- Sort Direction -->
                            <div>
                                <label class="form-label">{{ t('shop.orders.sort_direction') }}</label>
                                <select v-model="filterForm.sort_dir" class="form-select">
                                    <option value="desc">{{ t('shop.orders.sort_descending') }}</option>
                                    <option value="asc">{{ t('shop.orders.sort_ascending') }}</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <button type="submit" class="btn btn-primary" :disabled="filterForm.processing">
                                {{ filterForm.processing ? t('shop.orders.applying') : t('shop.orders.apply_filters') }}
                            </button>
                            <button
                                v-if="hasActiveFilters"
                                type="button"
                                class="btn btn-outline"
                                @click="clearFilters"
                            >
                                {{ t('shop.orders.clear_filters') }}
                            </button>
                        </div>
                    </form>
                </section>

                <!-- Orders Table -->
                <section class="section">
                    <div class="flex items-center justify-between">
                        <h2 class="section-heading">{{ t('shop.orders.title') }}</h2>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th class="table-header w-0">{{ t('shop.orders.order_number') }}</th>
                                    <th class="table-header">{{ t('shop.orders.date') }}</th>
                                    <th class="table-header">{{ t('shop.orders.customer') }}</th>
                                    <th class="table-header">{{ t('shop.orders.email') }}</th>
                                    <th class="table-header">{{ t('shop.orders.status') }}</th>
                                    <th class="table-cell text-right font-semibold text-gray-600 dark:text-gray-300">{{ t('shop.orders.total') }}</th>
                                    <th class="table-header w-32">{{ t('shop.orders.actions') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr
                                    v-for="order in orders"
                                    :key="order.id"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                                >
                                    <td class="table-cell">
                                        <Link
                                            :href="`${baseUrl}/show/${order.order_number}`"
                                            class="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                                            preserve-scroll
                                        >
                                            {{ order.order_number }}
                                        </Link>
                                    </td>
                                    <td class="table-cell text-sm text-gray-900 dark:text-white">
                                        {{ order.date }}
                                    </td>
                                    <td class="table-cell text-sm text-gray-900 dark:text-white">
                                        {{ order.customer_name }}
                                    </td>
                                    <td class="table-cell text-sm text-gray-900 dark:text-white">
                                        {{ order.customer_email }}
                                    </td>
                                    <td class="table-cell">
                                        <span
                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            :class="getStatusBadgeColor(order.status)"
                                        >
                                            {{ t(`shop.orders.${order.status}`) || order.status.charAt(0).toUpperCase() + order.status.slice(1) }}
                                        </span>
                                    </td>
                                    <td class="table-cell text-right text-sm font-medium text-gray-900 dark:text-white">
                                        {{ formatCurrency(order.total_amount, order.currency_sign, order.currency_code) }}
                                    </td>
                                    <td class="table-cell">
                                        <div class="btn-group" role="group">
                                            <Link
                                                :href="`${baseUrl}/show/${order.order_number}`"
                                                class="btn-group-item-edit"
                                                preserve-scroll
                                                :title="t('shop.orders.view_order')"
                                            >
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                    />
                                                </svg>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="orders.length === 0">
                                    <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        {{ hasActiveFilters ? t('shop.orders.no_orders_filtered') : t('shop.orders.no_orders') }}
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

