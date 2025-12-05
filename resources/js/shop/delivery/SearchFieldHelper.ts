import { ShopApiClient } from '../core/ShopApiClient';
import { DeliveryMethodFields, DependencyResolver, FieldOption } from '../core/Types';

/**
 * Helper utilities for search-based fields
 */
export class SearchFieldHelper {
    private searchTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor(
        private apiClient: ShopApiClient,
        private deliveryMethodId: number,
        private fields: DeliveryMethodFields
    ) {}

    /**
     * Create a debounced search function for a search field
     * Automatically resolves dependencies
     */
    createSearchHandler(
        fieldName: string,
        options: {
            searchMinLength?: number;
            limit?: number;
            onResults: (results: FieldOption[]) => void;
            onError?: (error: Error) => void;
            dependencyResolver?: DependencyResolver;
        }
    ): (searchString: string) => void {
        const field = this.fields[fieldName];
        const searchMinLength = options.searchMinLength || field?.search_min_length || 3;
        const limit = options.limit || 100;

        return (searchString: string) => {
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
                        } else {
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
    async search(
        fieldName: string,
        searchString: string,
        dependencyResolver?: DependencyResolver,
        limit?: number
    ): Promise<FieldOption[]> {
        const field = this.fields[fieldName];
        if (!field || field.options !== 'search') {
            throw new Error(`Field ${fieldName} is not a search field`);
        }

        let dependencies: Record<string, string> = {};

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
    async searchWithDependencies(
        fieldName: string,
        searchString: string,
        dependencies: Record<string, string>,
        limit?: number
    ): Promise<FieldOption[]> {
        return this.apiClient.getFieldOptions(this.deliveryMethodId, fieldName, {
            searchString,
            dependencies,
            limit,
        });
    }

    /**
     * Debounce utility
     */
    static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: ReturnType<typeof setTimeout> | null = null;

        return function executedFunction(...args: Parameters<T>) {
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

