/**
 * Helper utilities for search-based fields
 */
export class SearchFieldHelper {
    constructor(apiClient, deliveryMethodId, fields) {
        this.apiClient = apiClient;
        this.deliveryMethodId = deliveryMethodId;
        this.fields = fields;
        this.searchTimeouts = new Map();
    }
    /**
     * Create a debounced search function for a search field
     * Automatically resolves dependencies
     */
    createSearchHandler(fieldName, options) {
        const field = this.fields[fieldName];
        const searchMinLength = options.searchMinLength || field?.search_min_length || 3;
        const limit = options.limit || 100;
        return (searchString) => {
            // Clear previous timeout
            const existingTimeout = this.searchTimeouts.get(fieldName);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }
            const trimmed = searchString.trim();
            // Clear results if search is too short
            if (trimmed.length < searchMinLength) {
                options.onResults([]);
                return;
            }
            // Debounce search
            const timeout = setTimeout(() => {
                this.search(fieldName, trimmed, options.dependencyResolver, limit)
                    .then(options.onResults)
                    .catch(error => {
                    if (options.onError) {
                        options.onError(error);
                    }
                    else {
                        console.error('Search error:', error);
                    }
                });
                this.searchTimeouts.delete(fieldName);
            }, 300);
            this.searchTimeouts.set(fieldName, timeout);
        };
    }
    /**
     * Load search results for a field
     * Automatically resolves dependencies if dependencyResolver provided
     */
    async search(fieldName, searchString, dependencyResolver, limit) {
        const field = this.fields[fieldName];
        if (!field || field.options !== 'search') {
            throw new Error(`Field ${fieldName} is not a search field`);
        }
        let dependencies = {};
        if (dependencyResolver && field.depends_on) {
            // Resolve dependencies
            const depValue = dependencyResolver.getRefValue(field.depends_on) ||
                dependencyResolver.getValue(field.depends_on);
            if (depValue) {
                dependencies[field.depends_on] = depValue;
            }
        }
        return this.searchWithDependencies(fieldName, searchString, dependencies, limit);
    }
    /**
     * Search with explicit dependencies (advanced usage)
     */
    async searchWithDependencies(fieldName, searchString, dependencies, limit) {
        return this.apiClient.getFieldOptions(this.deliveryMethodId, fieldName, {
            searchString,
            dependencies,
            limit,
        });
    }
    /**
     * Debounce utility
     */
    static debounce(func, wait) {
        let timeout = null;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                func(...args);
            };
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(later, wait);
        };
    }
}
//# sourceMappingURL=SearchFieldHelper.js.map