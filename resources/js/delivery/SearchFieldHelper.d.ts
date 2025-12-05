import { ShopApiClient } from '../core/ShopApiClient';
import { DeliveryMethodFields, DependencyResolver, FieldOption } from '../core/Types';
/**
 * Helper utilities for search-based fields
 */
export declare class SearchFieldHelper {
    private apiClient;
    private deliveryMethodId;
    private fields;
    private searchTimeouts;
    constructor(apiClient: ShopApiClient, deliveryMethodId: number, fields: DeliveryMethodFields);
    /**
     * Create a debounced search function for a search field
     * Automatically resolves dependencies
     */
    createSearchHandler(fieldName: string, options: {
        searchMinLength?: number;
        limit?: number;
        onResults: (results: FieldOption[]) => void;
        onError?: (error: Error) => void;
        dependencyResolver?: DependencyResolver;
    }): (searchString: string) => void;
    /**
     * Load search results for a field
     * Automatically resolves dependencies if dependencyResolver provided
     */
    search(fieldName: string, searchString: string, dependencyResolver?: DependencyResolver, limit?: number): Promise<FieldOption[]>;
    /**
     * Search with explicit dependencies (advanced usage)
     */
    searchWithDependencies(fieldName: string, searchString: string, dependencies: Record<string, string>, limit?: number): Promise<FieldOption[]>;
    /**
     * Debounce utility
     */
    static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
}
//# sourceMappingURL=SearchFieldHelper.d.ts.map