import { DependencyManager } from './DependencyManager';
import { DynamicFieldLoader } from './DynamicFieldLoader';
import { SearchFieldHelper } from './SearchFieldHelper';
/**
 * Service for getting delivery method information with enhanced field functionality
 */
export class DeliveryMethodService {
    constructor(apiClient, deliveryMethodId) {
        this.apiClient = apiClient;
        this.deliveryMethodId = deliveryMethodId;
    }
    /**
     * Get field definitions for a delivery method
     * Returns enhanced fields with dependency information and helper methods
     */
    async getFields(dependencyResolver) {
        const methodInfo = await this.apiClient.getDeliveryMethodFields(this.deliveryMethodId);
        // Initialize helpers
        this.fieldLoader = new DynamicFieldLoader(this.apiClient, this.deliveryMethodId, methodInfo.fields);
        this.searchHelper = new SearchFieldHelper(this.apiClient, this.deliveryMethodId, methodInfo.fields);
        this.dependencyManager = new DependencyManager(methodInfo.fields);
        // Enhance fields with methods
        const enhancedFields = {};
        Object.keys(methodInfo.fields).forEach(fieldName => {
            enhancedFields[fieldName] = this.createEnhancedField(fieldName, methodInfo.fields[fieldName], methodInfo.fields);
        });
        return {
            ...methodInfo,
            fields: enhancedFields,
            dependencyManager: this.dependencyManager,
            getField: (fieldName) => enhancedFields[fieldName] || null,
            resolveDependencies: (fieldName, resolver) => {
                return this.fieldLoader.resolveDependencies(fieldName, resolver);
            },
        };
    }
    /**
     * Create an enhanced field with helper methods
     */
    createEnhancedField(fieldName, field, allFields) {
        return {
            ...field,
            _name: fieldName,
            _deliveryMethodId: this.deliveryMethodId,
            getOptions: async (dependencyResolver) => {
                // For static options, return immediately
                if (Array.isArray(field.options) && field.options.length > 0) {
                    return this.getStaticOptions(field);
                }
                // For dynamic options, load from API
                if (field.options === 'dynamic') {
                    return this.fieldLoader.loadOptions(fieldName, dependencyResolver);
                }
                // For search fields, return empty array
                return [];
            },
            createSearchHandler: (onResults, onError, dependencyResolver) => {
                if (!this.isSearchField(field)) {
                    throw new Error(`Field ${fieldName} is not a search field`);
                }
                return this.searchHelper.createSearchHandler(fieldName, {
                    searchMinLength: field.search_min_length,
                    limit: 100,
                    onResults,
                    onError,
                    dependencyResolver,
                });
            },
            hasOptions: () => {
                return (Array.isArray(field.options) && field.options.length > 0) ||
                    field.options === 'dynamic';
            },
            hasStaticOptions: () => {
                return Array.isArray(field.options) && field.options.length > 0;
            },
            hasDynamicOptions: () => {
                return field.options === 'dynamic';
            },
            getDependencies: () => {
                if (!field.depends_on)
                    return [];
                return this.dependencyManager.getDependencyChain(fieldName);
            },
            getDependentFields: () => {
                return this.dependencyManager.getDependentFields(fieldName);
            },
        };
    }
    /**
     * Get static options from field definition
     */
    getStaticOptions(field) {
        if (!Array.isArray(field.options)) {
            return [];
        }
        return field.options.map(option => {
            if (typeof option === 'string') {
                return { value: option, label: option };
            }
            return option;
        });
    }
    /**
     * Check if a field has dynamic options
     */
    hasDynamicOptions(field) {
        return field.options === 'dynamic';
    }
    /**
     * Check if a field is search-based
     */
    isSearchField(field) {
        return field.options === 'search';
    }
    /**
     * Get fields that depend on a given field
     */
    getDependentFields(fields, fieldName) {
        const manager = new DependencyManager(fields);
        return manager.getDependentFields(fieldName);
    }
    /**
     * Build dependency chain for a field (all fields it depends on)
     */
    getDependencyChain(fields, fieldName) {
        const manager = new DependencyManager(fields);
        return manager.getDependencyChain(fieldName);
    }
}
//# sourceMappingURL=DeliveryMethodService.js.map