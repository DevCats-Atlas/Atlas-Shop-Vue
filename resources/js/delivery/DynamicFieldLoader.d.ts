import { ShopApiClient } from '../core/ShopApiClient';
import { DeliveryMethodFields, DependencyResolver, FieldOption } from '../core/Types';
/**
 * Service for loading dynamic field options
 */
export declare class DynamicFieldLoader {
    private apiClient;
    private deliveryMethodId;
    private fields;
    constructor(apiClient: ShopApiClient, deliveryMethodId: number, fields: DeliveryMethodFields);
    /**
     * Load options for a dynamic select field
     * Automatically resolves dependencies using dependencyResolver
     */
    loadOptions(fieldName: string, dependencyResolver?: DependencyResolver): Promise<FieldOption[]>;
    /**
     * Load options with explicit dependencies (advanced usage)
     */
    loadOptionsWithDependencies(fieldName: string, dependencies: Record<string, string>): Promise<FieldOption[]>;
    /**
     * Resolve all dependencies for a field
     * Traverses dependency chain (e.g., city -> region, delivery_point -> city -> region)
     */
    resolveDependencies(fieldName: string, dependencyResolver: DependencyResolver): Record<string, string>;
    /**
     * Get dependency chain for a field
     */
    private getDependencyChain;
    /**
     * Check if all required dependencies are available
     */
    hasAllDependencies(fieldName: string, dependencyResolver: DependencyResolver): boolean;
    /**
     * Get missing dependencies for a field
     */
    getMissingDependencies(fieldName: string, dependencyResolver: DependencyResolver): string[];
}
//# sourceMappingURL=DynamicFieldLoader.d.ts.map