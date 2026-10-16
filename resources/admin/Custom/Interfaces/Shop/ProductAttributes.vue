<script setup>
import { adminUrl, adminModuleHandle } from '@/utils/adminUrl';
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { useToast } from '@/composables/useToast.js';
import { useTranslation } from '@/utils/useTranslation.js';

const props = defineProps({
    field: {
        type: Object,
        required: true,
    },
    model: {
        type: Object,
        default: () => ({}),
    },
});

const { t } = useTranslation();

const page = usePage();
const { showToast } = useToast();
const categoriesData = ref([]);
const selectedAttributes = ref([]);
const loading = ref(false);
const isMounted = ref(false);
const activeTab = ref(null);
const toggling = ref({}); // Track which attribute is being toggled

// Get current item ID - try from page props first (for users module), then fall back to URL query parameter
const currentItemId = computed(() => {
    // First, try to get item ID from page props (works for users module)
    const pageProps = page.props;
    if (pageProps?.item?.id) {
        return parseInt(pageProps.item.id, 10);
    }

    // Fall back to URL query parameter (for regular modules)
    const url = new URL(window.location.href);
    const itemParam = url.searchParams.get('item');
    return itemParam ? parseInt(itemParam, 10) : null;
});

// Get module handle from URL path (e.g., /admin/content/edit -> content)
const moduleHandle = computed(() => {
    return adminModuleHandle();
});

const baseUrl = computed(() => {
    if (!moduleHandle.value) {
        return '';
    }
    return adminUrl(`${moduleHandle.value}`);
});

const fetchProductAttributes = async () => {
    if (!isMounted.value || !currentItemId.value || !props.field.id) {
        return;
    }

    loading.value = true;
    try {
        const response = await fetch(
            `${baseUrl.value}/product-attributes?item_id=${currentItemId.value}&field_id=${props.field.id}`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            }
        );

        if (!response.ok || !isMounted.value) {
            throw new Error('Failed to fetch product attributes');
        }

        const data = await response.json();
        if (isMounted.value) {
            categoriesData.value = data.categories || [];
            selectedAttributes.value = data.selectedAttributes || [];

            // Set active tab to first category if available
            if (categoriesData.value.length > 0 && !activeTab.value) {
                activeTab.value = categoriesData.value[0].id;
            }
        }
    } catch (error) {
        if (isMounted.value) {
            console.error('Error fetching product attributes:', error);
            categoriesData.value = [];
            selectedAttributes.value = [];
        }
    } finally {
        if (isMounted.value) {
            loading.value = false;
        }
    }
};

// Check if an attribute is selected
const isAttributeSelected = (attributeId) => {
    return selectedAttributes.value.includes(attributeId);
};

// Toggle attribute selection
const toggleAttribute = async (attributeId) => {
    if (!currentItemId.value || !props.field.id) {
        return;
    }

    const newSelected = !isAttributeSelected(attributeId);

    // Track toggling state
    toggling.value[attributeId] = true;

    try {
        const response = await fetch(`${baseUrl.value}/product-attributes/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                item_id: currentItemId.value,
                attribute_id: attributeId,
                field_id: props.field.id,
                selected: newSelected,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || t('shop.product_attributes.toggle_attribute_failed'));
        }

        const data = await response.json();

        // Update local state
        if (newSelected) {
            if (!selectedAttributes.value.includes(attributeId)) {
                selectedAttributes.value.push(attributeId);
            }
        } else {
            selectedAttributes.value = selectedAttributes.value.filter(id => id !== attributeId);
        }

        // Show success toast
        showToast({
            title: t('admin.common.success'),
            message: t(newSelected ? 'shop.product_attributes.attribute_selected' : 'shop.product_attributes.attribute_deselected'),
            intent: 'success',
        });
    } catch (error) {
        console.error('Error toggling attribute:', error);
        showToast({
            title: t('admin.common.error'),
            message: error.message || t('shop.product_attributes.toggle_attribute_failed'),
            intent: 'danger',
        });
    } finally {
        toggling.value[attributeId] = false;
    }
};

onMounted(() => {
    isMounted.value = true;
    fetchProductAttributes();
});

onBeforeUnmount(() => {
    isMounted.value = false;
});
</script>

<template>
    <div class="space-y-4">
        <div>
            <label v-if="!(field.config?.hide_title === true)" class="form-label block mb-1">
                {{ field.title }}
            </label>
        </div>

        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            {{ t('shop.product_attributes.loading_attributes') }}
        </div>

        <div v-else-if="!currentItemId" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            {{ t('shop.product_attributes.save_before_attributes') }}
        </div>

        <div v-else-if="categoriesData.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            {{ t('shop.product_attributes.no_attribute_categories') }}
        </div>

        <div v-else class="space-y-4">
            <!-- Category Tabs -->
            <div class="border-divider">
                <nav class="-mb-px flex space-x-4">
                    <button
                        v-for="category in categoriesData"
                        :key="category.id"
                        type="button"
                        class="px-4 py-2 text-sm font-medium border-b-2 transition"
                        :class="activeTab === category.id
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'"
                        @click="activeTab = category.id"
                    >
                        {{ category.title }}
                    </button>
                </nav>
            </div>

            <!-- Category Content -->
            <div v-for="category in categoriesData" :key="category.id">
                <div v-if="activeTab === category.id" class="space-y-6">
                    <div v-if="category.groups.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">
                        {{ t('shop.product_attributes.no_attribute_groups') }}
                    </div>

                    <div v-else v-for="group in category.groups" :key="group.id" class="space-y-3">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ group.title }}</h4>

                        <div v-if="group.attributes.length === 0" class="text-xs text-gray-400 dark:text-gray-500 pl-4">
                            {{ t('shop.product_attributes.no_attributes') }}
                        </div>

                        <div v-else class="grid grid-cols-1 gap-3 ">
                            <label
                                v-for="attribute in group.attributes"
                                :key="attribute.id"
                                class="inline-flex items-center space-x-2 cursor-pointer p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                                :class="{
                                    'opacity-50': toggling[attribute.id],
                                    'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700': isAttributeSelected(attribute.id)
                                }"
                            >
                                <input
                                    type="checkbox"
                                    :checked="isAttributeSelected(attribute.id)"
                                    :disabled="toggling[attribute.id]"
                                    class="form-checkbox"
                                    @change="toggleAttribute(attribute.id)"
                                />
                                <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {{ attribute.title }}
                                </span>
                                <span v-if="toggling[attribute.id]" class="text-xs text-gray-400">
                                    ...
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
