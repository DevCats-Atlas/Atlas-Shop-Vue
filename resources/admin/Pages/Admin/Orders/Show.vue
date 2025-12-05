<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { useToast } from '@/composables/useToast.js';

const props = defineProps({
    title: {
        type: String,
        default: 'Order Details',
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
    order: {
        type: Object,
        required: true,
    },
    statusHistory: {
        type: Array,
        default: () => [],
    },
    availableStatusTransitions: {
        type: Array,
        default: () => [],
    },
    currentStatus: {
        type: String,
        required: true,
    },
    deliveryMethods: {
        type: Array,
        default: () => [],
    },
    paymentMethods: {
        type: Array,
        default: () => [],
    },
    paymentTransaction: {
        type: Object,
        default: null,
    },
});

const { showToast } = useToast();

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const indexUrl = computed(() => `${baseUrl.value}/index`);

// Status update modal
const statusUpdateModalOpen = ref(false);
const statusUpdateForm = useForm({
    status: '',
    notes: '',
});

const openStatusUpdateModal = () => {
    statusUpdateForm.reset();
    statusUpdateForm.status = '';
    statusUpdateForm.notes = '';
    statusUpdateModalOpen.value = true;
};

const closeStatusUpdateModal = () => {
    statusUpdateModalOpen.value = false;
    statusUpdateForm.reset();
};

const submitStatusUpdate = () => {
    statusUpdateForm.put(`${baseUrl.value}/${props.order.order_number}/status`, {
        preserveScroll: true,
        onSuccess: () => {
            closeStatusUpdateModal();
            showToast({
                title: 'Status Updated',
                message: 'Order status has been updated successfully.',
                intent: 'success',
            });
        },
        onError: (errors) => {
            // Errors will be displayed in the form
        },
    });
};

// Delivery method field definitions for display
const deliveryMethodFieldDefinitions = ref({});

// Load delivery method field definitions for display
const loadDeliveryMethodFieldsForDisplay = async (deliveryMethodId) => {
    if (!deliveryMethodId) {
        deliveryMethodFieldDefinitions.value = {};
        return;
    }

    try {
        const response = await fetch(`/api/shop/delivery-methods/${deliveryMethodId}/fields`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();
        
        if (data.success && data.fields) {
            // Convert to object with field names as keys
            const definitions = {};
            Object.entries(data.fields).forEach(([key, value]) => {
                definitions[key] = {
                    label: value.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    ...value,
                };
            });
            deliveryMethodFieldDefinitions.value = definitions;
        } else {
            deliveryMethodFieldDefinitions.value = {};
        }
    } catch (error) {
        console.error('Error loading delivery method fields for display:', error);
        deliveryMethodFieldDefinitions.value = {};
    }
};

// Get label for a delivery data field
const getDeliveryDataLabel = (fieldKey) => {
    if (deliveryMethodFieldDefinitions.value[fieldKey]) {
        return deliveryMethodFieldDefinitions.value[fieldKey].label;
    }
    // Fallback to formatted key name
    return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Order update modal
const orderUpdateModalOpen = ref(false);
const deliveryMethodFields = ref([]);
const deliveryMethodFieldsLoading = ref(false);
const deliveryMethodType = ref(null);
const fieldOptions = ref({}); // Store options for each field (e.g., { region: [...], city: [...] })
const citySearchResults = ref({}); // Store search results for city search fields
const citySearchTimeouts = ref({}); // Store timeouts for debouncing city search

const orderUpdateForm = useForm({
    customer_name: props.order.customer.name,
    customer_email: props.order.customer.email,
    customer_phone: props.order.customer.phone || '',
    customer_address: props.order.customer.address || '',
    delivery_method_id: props.order.delivery_method_id || '',
    payment_method_id: props.order.payment_method_id || '',
    delivery_data: props.order.delivery_data || {},
    subtotal: props.order.financial.subtotal,
    tax_amount: props.order.financial.tax_amount,
    shipping_amount: props.order.financial.shipping_amount,
    discount_amount: props.order.financial.discount_amount,
    total_amount: props.order.financial.total_amount,
    notes: props.order.notes || '',
});

// Load delivery method fields
const loadDeliveryMethodFields = async (deliveryMethodId) => {
    if (!deliveryMethodId) {
        deliveryMethodFields.value = [];
        // Clear delivery_data when no method is selected
        orderUpdateForm.delivery_data = {};
        return;
    }

    deliveryMethodFieldsLoading.value = true;
    
    try {
        const response = await fetch(`/api/shop/delivery-methods/${deliveryMethodId}/fields`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const data = await response.json();
        
        if (data.success && data.fields) {
            deliveryMethodType.value = data.delivery_method_type || null;
            deliveryMethodFields.value = Object.entries(data.fields).map(([key, value]) => ({
                name: key,
                ...value,
            }));
            
            // Initialize delivery_data fields with existing values or empty strings
            deliveryMethodFields.value.forEach(field => {
                if (!(field.name in orderUpdateForm.delivery_data)) {
                    orderUpdateForm.delivery_data[field.name] = '';
                }
            });
            
            // Load options for dynamic fields that don't depend on anything (e.g., region for New Post)
            if (deliveryMethodType.value === 'newpost') {
                const regionField = deliveryMethodFields.value.find(f => f.name === 'region');
                if (regionField && regionField.options === 'dynamic' && !regionField.depends_on) {
                    await loadFieldOptions(deliveryMethodId, 'region', {});
                }
            }
        } else {
            deliveryMethodFields.value = [];
            deliveryMethodType.value = null;
        }
    } catch (error) {
        console.error('Error loading delivery method fields:', error);
        deliveryMethodFields.value = [];
    } finally {
        deliveryMethodFieldsLoading.value = false;
    }
};

// Watch for delivery method changes
// Format price with currency
const formatPrice = (amount, currency = 'UAH') => {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'UAH',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
};

// Format date
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const watchDeliveryMethod = () => {
    if (orderUpdateForm.delivery_method_id) {
        // Clear field options when changing delivery method
        fieldOptions.value = {};
        loadDeliveryMethodFields(orderUpdateForm.delivery_method_id);
    } else {
        deliveryMethodFields.value = [];
        deliveryMethodType.value = null;
        fieldOptions.value = {};
    }
};

// Load options for a dynamic field (e.g., cities for region, delivery points for city)
const loadFieldOptions = async (deliveryMethodId, fieldName, dependencies = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (Object.keys(dependencies).length > 0) {
            queryParams.append('dependencies', JSON.stringify(dependencies));
        }
        
        const url = `/api/shop/delivery-methods/${deliveryMethodId}/field-options/${fieldName}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        
        const data = await response.json();
        
        if (data.success && data.options) {
            fieldOptions.value[fieldName] = data.options;
        } else {
            fieldOptions.value[fieldName] = [];
        }
    } catch (error) {
        console.error(`Error loading options for ${fieldName}:`, error);
        fieldOptions.value[fieldName] = [];
    }
};

// Handle field change for dependent fields (cascading selects)
const handleFieldChange = async (fieldName, value) => {
    // Clear dependent fields
    const dependentFields = deliveryMethodFields.value.filter(f => f.depends_on === fieldName || f.depends_on === fieldName + '_ref');
    dependentFields.forEach(field => {
        orderUpdateForm.delivery_data[field.name] = '';
        orderUpdateForm.delivery_data[field.name + '_ref'] = '';
        fieldOptions.value[field.name] = [];
        citySearchResults.value[field.name] = [];
        
        // Also clear fields that depend on this one (nested dependencies)
        const nestedDependentFields = deliveryMethodFields.value.filter(f => f.depends_on === field.name || f.depends_on === field.name + '_ref');
        nestedDependentFields.forEach(nestedField => {
            orderUpdateForm.delivery_data[nestedField.name] = '';
            orderUpdateForm.delivery_data[nestedField.name + '_ref'] = '';
            fieldOptions.value[nestedField.name] = [];
            citySearchResults.value[nestedField.name] = [];
        });
    });
    
    // Load options for dependent fields if value is set
    if (value && orderUpdateForm.delivery_method_id) {
        for (const dependentField of dependentFields) {
            if (dependentField.options === 'dynamic') {
                const dependencies = {};
                const depKey = dependentField.depends_on.replace('_ref', '');
                dependencies[dependentField.depends_on] = value;
                await loadFieldOptions(orderUpdateForm.delivery_method_id, dependentField.name, dependencies);
            }
        }
    }
};

// Handle city search input
const handleCitySearch = (field, event) => {
    const searchValue = event.target.value.trim();
    const minLength = field.search_min_length || 3;
    
    // Clear timeout if exists
    if (citySearchTimeouts.value[field.name]) {
        clearTimeout(citySearchTimeouts.value[field.name]);
    }
    
    // Clear results if search is too short
    if (searchValue.length < minLength) {
        citySearchResults.value[field.name] = [];
        orderUpdateForm.delivery_data[field.name + '_ref'] = '';
        return;
    }
    
    // Get dependency value (region)
    const dependsOn = field.depends_on || '';
    const dependencyValue = dependsOn ? (orderUpdateForm.delivery_data[dependsOn] || orderUpdateForm.delivery_data[dependsOn.replace('_ref', '')]) : null;
    
    if (!dependencyValue) {
        citySearchResults.value[field.name] = [];
        return;
    }
    
    // Debounce search
    citySearchTimeouts.value[field.name] = setTimeout(async () => {
        const dependencies = {};
        if (dependsOn) {
            dependencies[dependsOn] = dependencyValue;
        }
        
        await loadCitySearchResults(orderUpdateForm.delivery_method_id, field.name, searchValue, dependencies);
    }, 300);
};

// Handle city search blur
const handleCitySearchBlur = (field) => {
    // Hide results after a short delay to allow clicking
    setTimeout(() => {
        citySearchResults.value[field.name] = [];
    }, 200);
};

// Load city search results
const loadCitySearchResults = async (deliveryMethodId, fieldName, searchString, dependencies) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('search', searchString);
        if (Object.keys(dependencies).length > 0) {
            queryParams.append('dependencies', JSON.stringify(dependencies));
        }
        
        const url = `/api/shop/delivery-methods/${deliveryMethodId}/field-options/${fieldName}?${queryParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        
        const data = await response.json();
        
        if (data.success && data.options) {
            citySearchResults.value[fieldName] = data.options;
        } else {
            citySearchResults.value[fieldName] = [];
        }
    } catch (error) {
        console.error(`Error loading city search results for ${fieldName}:`, error);
        citySearchResults.value[fieldName] = [];
    }
};

// Select city from search results
const selectCityResult = (field, result) => {
    orderUpdateForm.delivery_data[field.name] = result.label;
    orderUpdateForm.delivery_data[field.name + '_ref'] = result.value;
    citySearchResults.value[field.name] = [];
    
    // Trigger loading delivery points
    handleFieldChange(field.name + '_ref', result.value);
};

const openOrderUpdateModal = async () => {
    orderUpdateForm.reset();
    orderUpdateForm.customer_name = props.order.customer.name;
    orderUpdateForm.customer_email = props.order.customer.email;
    orderUpdateForm.customer_phone = props.order.customer.phone || '';
    orderUpdateForm.customer_address = props.order.customer.address || '';
    orderUpdateForm.delivery_method_id = props.order.delivery_method_id || null;
    orderUpdateForm.payment_method_id = props.order.payment_method_id || null;
    
    // Initialize delivery_data object properly
    const existingDeliveryData = props.order.delivery_data || {};
    orderUpdateForm.delivery_data = {};
    
    // Copy existing values
    Object.keys(existingDeliveryData).forEach(key => {
        orderUpdateForm.delivery_data[key] = existingDeliveryData[key];
    });
    
    // For New Post: Map stored field names to form field names
    // Storage has 'region_ref' but form uses 'region'
    if (orderUpdateForm.delivery_method_id) {
        if (existingDeliveryData.region_ref && !existingDeliveryData.region) {
            orderUpdateForm.delivery_data.region = existingDeliveryData.region_ref;
        }
        // Map delivery_point_name to delivery_point if delivery_point is empty
        // (delivery_point_name is the formatted name from API, but form needs the searchable text)
        if (existingDeliveryData.delivery_point_name && !existingDeliveryData.delivery_point) {
            orderUpdateForm.delivery_data.delivery_point = existingDeliveryData.delivery_point_name;
        } else if (!existingDeliveryData.delivery_point && existingDeliveryData.delivery_point_address) {
            // Fallback: use address if name is not available
            orderUpdateForm.delivery_data.delivery_point = existingDeliveryData.delivery_point_address;
        }
        
        // Ensure delivery_point_ref exists
        if (existingDeliveryData.delivery_point_ref) {
            orderUpdateForm.delivery_data.delivery_point_ref = existingDeliveryData.delivery_point_ref;
        } else if (existingDeliveryData.delivery_point && !existingDeliveryData.delivery_point_ref) {
            // Old format - check if delivery_point looks like a UUID (ref), if so use it
            const deliveryPointValue = existingDeliveryData.delivery_point;
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deliveryPointValue)) {
                orderUpdateForm.delivery_data.delivery_point_ref = deliveryPointValue;
            }
        }
    }
    
    orderUpdateForm.subtotal = props.order.financial.subtotal;
    orderUpdateForm.tax_amount = props.order.financial.tax_amount;
    orderUpdateForm.shipping_amount = props.order.financial.shipping_amount;
    orderUpdateForm.discount_amount = props.order.financial.discount_amount;
    orderUpdateForm.total_amount = props.order.financial.total_amount;
    orderUpdateForm.notes = props.order.notes || '';
    
    orderUpdateModalOpen.value = true;
    
    // Load delivery method fields if a method is already selected
    if (orderUpdateForm.delivery_method_id) {
        await loadDeliveryMethodFields(orderUpdateForm.delivery_method_id);
        
        // Load field options for existing delivery data (for cascading selects like New Post)
        if (deliveryMethodType.value === 'newpost' && orderUpdateForm.delivery_data) {
            // Load regions (already done in loadDeliveryMethodFields, but ensure it's loaded)
            if (!fieldOptions.value.region || fieldOptions.value.region.length === 0) {
                await loadFieldOptions(orderUpdateForm.delivery_method_id, 'region', {});
            }
            
            // Ensure region is set correctly (should be set from region_ref mapping above)
            // Wait for next tick to ensure Vue has updated the DOM with options
            await nextTick();
            
            // For delivery points: Since delivery_point is now a search field, values are already set
            // The delivery_point (name) and delivery_point_ref are already in orderUpdateForm.delivery_data
            // No need to load options - user can search again if they want to change it
        }
    } else {
        deliveryMethodFields.value = [];
    }
};

const closeOrderUpdateModal = () => {
    orderUpdateModalOpen.value = false;
    orderUpdateForm.reset();
};

const submitOrderUpdate = () => {
    orderUpdateForm.put(`${baseUrl.value}/${props.order.order_number}/update`, {
        preserveScroll: true,
        onSuccess: () => {
            closeOrderUpdateModal();
            showToast({
                title: 'Order Updated',
                message: 'Order information has been updated successfully.',
                intent: 'success',
            });
        },
        onError: (errors) => {
            // Errors will be displayed in the form
        },
    });
};

// Calculate total when financial fields change
const calculateTotal = () => {
    const subtotal = parseFloat(orderUpdateForm.subtotal) || 0;
    const taxAmount = parseFloat(orderUpdateForm.tax_amount) || 0;
    const shippingAmount = parseFloat(orderUpdateForm.shipping_amount) || 0;
    const discountAmount = parseFloat(orderUpdateForm.discount_amount) || 0;
    orderUpdateForm.total_amount = Math.max(0, subtotal + taxAmount + shippingAmount - discountAmount);
};

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
    if (!amount && amount !== 0) return '-';
    const sign = currencySign || '';
    const code = currencyCode || '';
    return sign ? `${sign}${amount.toFixed(2)}` : `${amount.toFixed(2)} ${code}`.trim();
};

// Load delivery method fields on component mount if delivery method exists
onMounted(() => {
    if (props.order.delivery_method_id) {
        loadDeliveryMethodFieldsForDisplay(props.order.delivery_method_id);
    }
});
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <!-- Header -->
                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Order</p>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
                                {{ order.order_number }}
                            </h1>
                            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {{ formatDate(order.created_at) }}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                :class="getStatusBadgeColor(order.status)"
                            >
                                {{ order.status.charAt(0).toUpperCase() + order.status.slice(1) }}
                            </span>
                            <button
                                type="button"
                                class="btn btn-outline"
                                @click="openOrderUpdateModal"
                            >
                                Edit Order
                            </button>
                            <button
                                v-if="availableStatusTransitions.length > 0"
                                type="button"
                                class="btn btn-primary"
                                @click="openStatusUpdateModal"
                            >
                                Update Status
                            </button>
                            <Link :href="indexUrl" class="btn btn-outline" preserve-scroll>
                                Back to Orders
                            </Link>
                        </div>
                    </div>
                </section>

                <div class="grid gap-6 lg:grid-cols-3">
                    <!-- Main Content -->
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Order Items -->
                        <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Order Items</h2>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                    <thead class="bg-gray-50 dark:bg-gray-900/40">
                                        <tr>
                                            <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Product</th>
                                            <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">SKU</th>
                                            <th class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Quantity</th>
                                            <th class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Price</th>
                                            <th class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                        <tr
                                            v-for="item in order.items"
                                            :key="item.id"
                                            class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                                        >
                                            <td class="px-4 py-2">
                                                <div class="flex items-center gap-3">
                                                    <img
                                                        v-if="item.product_image"
                                                        :src="item.product_image"
                                                        :alt="item.product_title"
                                                        class="w-12 h-12 object-cover rounded"
                                                    />
                                                    <div>
                                                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                                                            {{ item.product_title }}
                                                        </p>
                                                        <p
                                                            v-if="item.attributes && Object.keys(item.attributes).length > 0"
                                                            class="text-xs text-gray-500 dark:text-gray-400"
                                                        >
                                                            Attributes: {{ Object.keys(item.attributes).map(key => `${key}: ${item.attributes[key]}`).join(', ') }}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                                {{ item.product_sku || '-' }}
                                            </td>
                                            <td class="px-4 py-2 text-right text-sm text-gray-900 dark:text-white">
                                                {{ item.quantity }}
                                            </td>
                                            <td class="px-4 py-2 text-right text-sm text-gray-900 dark:text-white">
                                                {{ formatCurrency(item.price, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                            </td>
                                            <td class="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                                                {{ formatCurrency(item.subtotal, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <!-- Customer Information -->
                        <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Customer Information</h2>
                            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ order.customer.name }}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                                        <a :href="`mailto:${order.customer.email}`" class="text-indigo-600 dark:text-indigo-300 hover:underline">
                                            {{ order.customer.email }}
                                        </a>
                                    </dd>
                                </div>
                                <div v-if="order.customer.phone">
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                                        <a :href="`tel:${order.customer.phone}`" class="text-indigo-600 dark:text-indigo-300 hover:underline">
                                            {{ order.customer.phone }}
                                        </a>
                                    </dd>
                                </div>
                                <div v-if="order.customer.address">
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-line">{{ order.customer.address }}</dd>
                                </div>
                            </dl>
                        </section>

                        <!-- Delivery & Payment Information -->
                        <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Delivery & Payment</h2>
                            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <!-- Delivery Method -->
                                <div>
                                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Delivery Method</h3>
                                    <p class="text-sm text-gray-900 dark:text-white">
                                        {{ order.delivery_method?.title || '-' }}
                                    </p>
                                    <div v-if="order.delivery_data && Object.keys(order.delivery_data).length > 0" class="mt-3 space-y-3">
                                        <!-- Location Information -->
                                        <div v-if="order.delivery_data.region_name || order.delivery_data.city_name">
                                            <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</h4>
                                            <div class="space-y-1 pl-2">
                                                <p v-if="order.delivery_data.region_name" class="text-xs text-gray-600 dark:text-gray-400">
                                                    <span class="font-medium">Region:</span> {{ order.delivery_data.region_name }}
                                                </p>
                                                <p v-if="order.delivery_data.city_name" class="text-xs text-gray-600 dark:text-gray-400">
                                                    <span class="font-medium">City:</span> {{ order.delivery_data.city_name }}
                                                </p>
                                                <p v-else-if="order.delivery_data.city" class="text-xs text-gray-600 dark:text-gray-400">
                                                    <span class="font-medium">City:</span> {{ order.delivery_data.city }}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <!-- Delivery Point Information -->
                                        <div v-if="order.delivery_data.delivery_point_name || order.delivery_data.delivery_point_address || order.delivery_data.delivery_point_number">
                                            <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Delivery Point</h4>
                                            <div class="space-y-1 pl-2">
                                                <p v-if="order.delivery_data.delivery_point_name" class="text-xs text-gray-600 dark:text-gray-400">
                                                    {{ order.delivery_data.delivery_point_name }}
                                                    <span v-if="order.delivery_data.delivery_point_number" class="text-gray-500">#{{ order.delivery_data.delivery_point_number }}</span>
                                                </p>
                                                <p v-if="order.delivery_data.delivery_point_address" class="text-xs text-gray-600 dark:text-gray-400">
                                                    {{ order.delivery_data.delivery_point_address }}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <!-- Recipient Information -->
                                        <div v-if="order.delivery_data.recipient_name || order.delivery_data.recipient_phone">
                                            <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recipient</h4>
                                            <div class="space-y-1 pl-2">
                                                <p v-if="order.delivery_data.recipient_name" class="text-xs text-gray-600 dark:text-gray-400">
                                                    <span class="font-medium">Name:</span> {{ order.delivery_data.recipient_name }}
                                                </p>
                                                <p v-if="order.delivery_data.recipient_phone" class="text-xs text-gray-600 dark:text-gray-400">
                                                    <span class="font-medium">Phone:</span> {{ order.delivery_data.recipient_phone }}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <!-- Other fields (fallback for any other fields not shown above) -->
                                        <template v-for="(value, key) in order.delivery_data" :key="key">
                                            <div v-if="!['region_name', 'city_name', 'city', 'delivery_point_name', 'delivery_point_address', 'delivery_point_number', 'delivery_point', 'recipient_name', 'recipient_phone', 'region_ref', 'city_ref', 'delivery_point_ref'].includes(key) && value"
                                                 class="text-xs text-gray-600 dark:text-gray-400">
                                                <span class="font-medium">{{ getDeliveryDataLabel(key) }}:</span> {{ value }}
                                            </div>
                                        </template>
                                        
                                        <!-- Hide hidden fields (those ending with _ref) from display -->
                                        <!-- These are already handled by the form fields above -->
                                    </div>
                                </div>
                                <!-- Payment Method -->
                                <div>
                                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Payment Method</h3>
                                    <p class="text-sm text-gray-900 dark:text-white">
                                        {{ order.payment_method?.title || '-' }}
                                    </p>
                                    
                                    <!-- Payment Transaction Details -->
                                    <div v-if="paymentTransaction" class="mt-4 space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Details</h4>
                                        
                                        <!-- Payment Status -->
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs text-gray-600 dark:text-gray-400">Status:</span>
                                            <span 
                                                class="text-xs font-medium px-2 py-1 rounded"
                                                :class="{
                                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': paymentTransaction.status === 'completed',
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': paymentTransaction.status === 'pending' || paymentTransaction.status === 'processing',
                                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': paymentTransaction.status === 'failed' || paymentTransaction.status === 'cancelled',
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200': !['completed', 'pending', 'processing', 'failed', 'cancelled'].includes(paymentTransaction.status),
                                                }"
                                            >
                                                {{ paymentTransaction.status_label }}
                                            </span>
                                        </div>
                                        
                                        <!-- Amount -->
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs text-gray-600 dark:text-gray-400">Amount:</span>
                                            <span class="text-xs font-medium text-gray-900 dark:text-white">
                                                {{ formatPrice(paymentTransaction.amount, paymentTransaction.currency) }}
                                            </span>
                                        </div>
                                        
                                        <!-- Provider -->
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs text-gray-600 dark:text-gray-400">Provider:</span>
                                            <span class="text-xs font-medium text-gray-900 dark:text-white uppercase">
                                                {{ paymentTransaction.provider }}
                                            </span>
                                        </div>
                                        
                                        <!-- Provider Transaction ID -->
                                        <div v-if="paymentTransaction.provider_transaction_id" class="flex items-center justify-between">
                                            <span class="text-xs text-gray-600 dark:text-gray-400">Transaction ID:</span>
                                            <span class="text-xs font-mono text-gray-700 dark:text-gray-300">
                                                {{ paymentTransaction.provider_transaction_id }}
                                            </span>
                                        </div>
                                        
                                        <!-- Processed Date -->
                                        <div v-if="paymentTransaction.processed_at" class="flex items-center justify-between">
                                            <span class="text-xs text-gray-600 dark:text-gray-400">Processed:</span>
                                            <span class="text-xs text-gray-700 dark:text-gray-300">
                                                {{ formatDate(paymentTransaction.processed_at) }}
                                            </span>
                                        </div>
                                        
                                        <!-- Created Date -->
                                        <div v-if="paymentTransaction.created_at" class="flex items-center justify-between">
                                            <span class="text-xs text-gray-600 dark:text-gray-400">Created:</span>
                                            <span class="text-xs text-gray-700 dark:text-gray-300">
                                                {{ formatDate(paymentTransaction.created_at) }}
                                            </span>
                                        </div>
                                        
                                        <!-- Error Message -->
                                        <div v-if="paymentTransaction.error_message" class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                            <p class="text-xs text-red-600 dark:text-red-400">
                                                <span class="font-medium">Error:</span> {{ paymentTransaction.error_message }}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <!-- No Payment Transaction Message -->
                                    <div v-else-if="order.payment_method" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p class="text-xs text-gray-500 dark:text-gray-400 italic">
                                            Payment transaction not found or not yet processed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <!-- Sidebar -->
                    <div class="space-y-6">
                        <!-- Financial Summary -->
                        <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Financial Summary</h2>
                            <dl class="space-y-3">
                                <div class="flex justify-between">
                                    <dt class="text-sm text-gray-600 dark:text-gray-400">Subtotal</dt>
                                    <dd class="text-sm font-medium text-gray-900 dark:text-white">
                                        {{ formatCurrency(order.financial.subtotal, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                    </dd>
                                </div>
                                <div v-if="order.financial.tax_amount > 0" class="flex justify-between">
                                    <dt class="text-sm text-gray-600 dark:text-gray-400">Tax</dt>
                                    <dd class="text-sm font-medium text-gray-900 dark:text-white">
                                        {{ formatCurrency(order.financial.tax_amount, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                    </dd>
                                </div>
                                <div v-if="order.financial.shipping_amount > 0" class="flex justify-between">
                                    <dt class="text-sm text-gray-600 dark:text-gray-400">Shipping</dt>
                                    <dd class="text-sm font-medium text-gray-900 dark:text-white">
                                        {{ formatCurrency(order.financial.shipping_amount, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                    </dd>
                                </div>
                                <div v-if="order.financial.discount_amount > 0" class="flex justify-between">
                                    <dt class="text-sm text-gray-600 dark:text-gray-400">Discount</dt>
                                    <dd class="text-sm font-medium text-gray-900 dark:text-white text-red-600 dark:text-red-400">
                                        -{{ formatCurrency(order.financial.discount_amount, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                    </dd>
                                </div>
                                <div class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <dt class="text-base font-semibold text-gray-900 dark:text-white">Total</dt>
                                    <dd class="text-base font-semibold text-gray-900 dark:text-white">
                                        {{ formatCurrency(order.financial.total_amount, order.currency?.left_sign || order.currency?.right_sign, order.currency?.code) }}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <!-- Status History -->
                        <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Status History</h2>
                            <div class="space-y-4">
                                <div
                                    v-for="history in statusHistory"
                                    :key="history.id"
                                    class="flex gap-4"
                                >
                                    <div class="flex flex-col items-center">
                                        <div class="w-2 h-2 rounded-full bg-blue-600"></div>
                                        <div class="w-px h-full bg-gray-300 dark:bg-gray-600 mt-1" :class="{ 'opacity-0': history === statusHistory[statusHistory.length - 1] }"></div>
                                    </div>
                                    <div class="flex-1 pb-4">
                                        <div class="flex items-center gap-2">
                                            <span
                                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                                :class="getStatusBadgeColor(history.status_to)"
                                            >
                                                {{ history.status_to.charAt(0).toUpperCase() + history.status_to.slice(1) }}
                                            </span>
                                            <span v-if="history.status_from" class="text-xs text-gray-500 dark:text-gray-400">
                                                from {{ history.status_from }}
                                            </span>
                                        </div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {{ history.formatted_date }}
                                            <span v-if="history.changed_by_name"> by {{ history.changed_by_name }}</span>
                                        </p>
                                        <p v-if="history.notes" class="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                            {{ history.notes }}
                                        </p>
                                    </div>
                                </div>
                                <div v-if="statusHistory.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                                    No status changes yet.
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>

        <!-- Status Update Modal -->
        <ModalDialog :open="statusUpdateModalOpen" title="Update Order Status" @close="closeStatusUpdateModal">
            <form @submit.prevent="submitStatusUpdate" class="space-y-4">
                <div>
                    <label class="form-label">Current Status</label>
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                        <span
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            :class="getStatusBadgeColor(currentStatus)"
                        >
                            {{ currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1) }}
                        </span>
                    </p>
                </div>

                <div>
                    <label class="form-label">New Status</label>
                    <select
                        v-model="statusUpdateForm.status"
                        class="form-select"
                        :class="{ 'form-input-error': statusUpdateForm.errors.status }"
                        required
                    >
                        <option value="" disabled>Select new status</option>
                        <option
                            v-for="status in availableStatusTransitions"
                            :key="status.value"
                            :value="status.value"
                        >
                            {{ status.label }}
                        </option>
                    </select>
                    <p v-if="statusUpdateForm.errors.status" class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {{ statusUpdateForm.errors.status }}
                    </p>
                    <p v-if="availableStatusTransitions.length === 0" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        No status transitions available. This order is in a terminal state.
                    </p>
                </div>

                <div>
                    <label class="form-label">Notes (Optional)</label>
                    <textarea
                        v-model="statusUpdateForm.notes"
                        class="form-textarea"
                        :class="{ 'form-input-error': statusUpdateForm.errors.notes }"
                        rows="3"
                        placeholder="Add notes about this status change..."
                    ></textarea>
                    <p v-if="statusUpdateForm.errors.notes" class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {{ statusUpdateForm.errors.notes }}
                    </p>
                </div>

                <div class="flex items-center justify-end gap-3">
                    <button type="button" class="btn-text" @click="closeStatusUpdateModal">Cancel</button>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        :disabled="statusUpdateForm.processing || availableStatusTransitions.length === 0"
                    >
                        {{ statusUpdateForm.processing ? 'Updating...' : 'Update Status' }}
                    </button>
                </div>
            </form>
        </ModalDialog>

        <!-- Order Update Modal -->
        <ModalDialog :open="orderUpdateModalOpen" title="Edit Order Information" @close="closeOrderUpdateModal" size="xl">
            <form @submit.prevent="submitOrderUpdate" class="space-y-6">
                <!-- Customer Information -->
                <div class="space-y-4">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Customer Information</h3>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label class="form-label">Customer Name *</label>
                            <input
                                v-model="orderUpdateForm.customer_name"
                                type="text"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.customer_name }"
                                required
                            />
                            <p v-if="orderUpdateForm.errors.customer_name" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.customer_name }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Customer Email *</label>
                            <input
                                v-model="orderUpdateForm.customer_email"
                                type="email"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.customer_email }"
                                required
                            />
                            <p v-if="orderUpdateForm.errors.customer_email" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.customer_email }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Customer Phone</label>
                            <input
                                v-model="orderUpdateForm.customer_phone"
                                type="tel"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.customer_phone }"
                            />
                            <p v-if="orderUpdateForm.errors.customer_phone" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.customer_phone }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Customer Address</label>
                            <textarea
                                v-model="orderUpdateForm.customer_address"
                                class="form-textarea"
                                :class="{ 'form-input-error': orderUpdateForm.errors.customer_address }"
                                rows="3"
                            ></textarea>
                            <p v-if="orderUpdateForm.errors.customer_address" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.customer_address }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Financial Information -->
                <div class="space-y-4">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Financial Information</h3>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label class="form-label">Subtotal</label>
                            <input
                                v-model.number="orderUpdateForm.subtotal"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.subtotal }"
                                @input="calculateTotal"
                            />
                            <p v-if="orderUpdateForm.errors.subtotal" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.subtotal }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Tax Amount</label>
                            <input
                                v-model.number="orderUpdateForm.tax_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.tax_amount }"
                                @input="calculateTotal"
                            />
                            <p v-if="orderUpdateForm.errors.tax_amount" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.tax_amount }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Shipping Amount</label>
                            <input
                                v-model.number="orderUpdateForm.shipping_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.shipping_amount }"
                                @input="calculateTotal"
                            />
                            <p v-if="orderUpdateForm.errors.shipping_amount" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.shipping_amount }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Discount Amount</label>
                            <input
                                v-model.number="orderUpdateForm.discount_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.discount_amount }"
                                @input="calculateTotal"
                            />
                            <p v-if="orderUpdateForm.errors.discount_amount" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.discount_amount }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Total Amount</label>
                            <input
                                v-model.number="orderUpdateForm.total_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-input"
                                :class="{ 'form-input-error': orderUpdateForm.errors.total_amount }"
                                readonly
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-calculated</p>
                            <p v-if="orderUpdateForm.errors.total_amount" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.total_amount }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Delivery and Payment Methods -->
                <div class="space-y-4">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Delivery & Payment</h3>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label class="form-label">Delivery Method</label>
                            <select
                                v-model.number="orderUpdateForm.delivery_method_id"
                                class="form-select"
                                :class="{ 'form-input-error': orderUpdateForm.errors.delivery_method_id }"
                                @change="watchDeliveryMethod"
                            >
                                <option :value="null">None</option>
                                <option
                                    v-for="method in deliveryMethods"
                                    :key="method.id"
                                    :value="method.id"
                                >
                                    {{ method.title }}
                                </option>
                            </select>
                            <p v-if="orderUpdateForm.errors.delivery_method_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.delivery_method_id }}
                            </p>
                            
                            <!-- Delivery Method Fields -->
                            <div v-if="deliveryMethodFieldsLoading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                Loading delivery options...
                            </div>
                            <div v-else-if="deliveryMethodFields.length > 0" class="mt-4 space-y-4">
                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Delivery Details</h4>
                                <div
                                    v-for="field in deliveryMethodFields"
                                    :key="field.name"
                                    v-show="field.type !== 'hidden'"
                                    class="space-y-2"
                                >
                                    <label v-if="field.type !== 'hidden'" class="form-label">
                                        {{ field.label || field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
                                        <span v-if="field.required" class="text-red-600 dark:text-red-400">*</span>
                                    </label>
                                    <!-- Hidden fields are rendered separately without labels -->
                                    <input
                                        v-if="field.type === 'hidden'"
                                        type="hidden"
                                        v-model="orderUpdateForm.delivery_data[field.name]"
                                    />
                                    <div v-else-if="field.type === 'text' && field.options === 'search'" class="relative">
                                        <input
                                            v-model="orderUpdateForm.delivery_data[field.name]"
                                            type="text"
                                            class="form-input"
                                            :class="{ 'form-input-error': orderUpdateForm.errors[`delivery_data.${field.name}`] }"
                                            :required="field.required"
                                            :placeholder="field.placeholder || ''"
                                            :minlength="field.search_min_length || 3"
                                            @input="handleCitySearch(field, $event)"
                                            @blur="handleCitySearchBlur(field)"
                                        />
                                        <!-- Hidden _ref field is already handled by the hidden field type in field definitions -->
                                        <div
                                            v-if="citySearchResults[field.name] && citySearchResults[field.name].length > 0"
                                            class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                                            style="top: 100%;"
                                        >
                                            <div
                                                v-for="result in citySearchResults[field.name]"
                                                :key="result.value"
                                                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                @click="selectCityResult(field, result)"
                                            >
                                                {{ result.label }}
                                            </div>
                                        </div>
                                    </div>
                                    <select
                                        v-else-if="field.type === 'select'"
                                        v-model="orderUpdateForm.delivery_data[field.name]"
                                        class="form-select"
                                        :class="{ 'form-input-error': orderUpdateForm.errors[`delivery_data.${field.name}`] }"
                                        :required="field.required"
                                        :disabled="field.options === 'dynamic' && (!fieldOptions[field.name] || fieldOptions[field.name].length === 0)"
                                        @change="handleFieldChange(field.name, orderUpdateForm.delivery_data[field.name])"
                                    >
                                        <option value="">{{ field.placeholder || 'Select...' }}</option>
                                        <option
                                            v-for="option in (field.options === 'dynamic' ? (fieldOptions[field.name] || []) : (field.options || []))"
                                            :key="typeof option === 'object' ? option.value : option"
                                            :value="typeof option === 'object' ? option.value : option"
                                        >
                                            {{ typeof option === 'object' ? option.label : option }}
                                        </option>
                                    </select>
                                    <textarea
                                        v-else-if="field.type === 'textarea'"
                                        v-model="orderUpdateForm.delivery_data[field.name]"
                                        class="form-textarea"
                                        :class="{ 'form-input-error': orderUpdateForm.errors[`delivery_data.${field.name}`] }"
                                        :required="field.required"
                                        :placeholder="field.placeholder || ''"
                                        :rows="field.rows || 3"
                                    ></textarea>
                                    <input
                                        v-else
                                        v-model="orderUpdateForm.delivery_data[field.name]"
                                        :type="field.type || 'text'"
                                        class="form-input"
                                        :class="{ 'form-input-error': orderUpdateForm.errors[`delivery_data.${field.name}`] }"
                                        :required="field.required"
                                        :placeholder="field.placeholder || ''"
                                    />
                                    <p v-if="field.help_text" class="text-xs text-gray-500 dark:text-gray-400">
                                        {{ field.help_text }}
                                    </p>
                                    <p v-if="orderUpdateForm.errors[`delivery_data.${field.name}`]" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                        {{ orderUpdateForm.errors[`delivery_data.${field.name}`] }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="form-label">Payment Method</label>
                            <select
                                v-model.number="orderUpdateForm.payment_method_id"
                                class="form-select"
                                :class="{ 'form-input-error': orderUpdateForm.errors.payment_method_id }"
                            >
                                <option :value="null">None</option>
                                <option
                                    v-for="method in paymentMethods"
                                    :key="method.id"
                                    :value="method.id"
                                >
                                    {{ method.title }}
                                </option>
                            </select>
                            <p v-if="orderUpdateForm.errors.payment_method_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
                                {{ orderUpdateForm.errors.payment_method_id }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Notes -->
                <div>
                    <label class="form-label">Order Notes</label>
                    <textarea
                        v-model="orderUpdateForm.notes"
                        class="form-textarea"
                        :class="{ 'form-input-error': orderUpdateForm.errors.notes }"
                        rows="4"
                        placeholder="Add notes about this order..."
                    ></textarea>
                    <p v-if="orderUpdateForm.errors.notes" class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {{ orderUpdateForm.errors.notes }}
                    </p>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" class="btn-text" @click="closeOrderUpdateModal">Cancel</button>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        :disabled="orderUpdateForm.processing"
                    >
                        {{ orderUpdateForm.processing ? 'Updating...' : 'Update Order' }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </AdminLayout>
</template>

