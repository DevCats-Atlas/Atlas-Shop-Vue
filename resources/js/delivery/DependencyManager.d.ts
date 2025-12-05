import { DeliveryMethodFields } from '../core/Types';
/**
 * Manages field dependencies and relationships
 */
export declare class DependencyManager {
    private fields;
    private dependencyGraph;
    constructor(fields: DeliveryMethodFields);
    /**
     * Build dependency graph from field definitions
     */
    private buildDependencyGraph;
    /**
     * Get all fields that a field depends on (transitive dependencies)
     * Example: delivery_point -> [city, region] (city depends on region)
     */
    getDependencyChain(fieldName: string): string[];
    /**
     * Get all fields that depend on a given field
     */
    getDependentFields(fieldName: string): string[];
    /**
     * Get dependency graph
     */
    getDependencyGraph(): Map<string, string[]>;
    /**
     * Validate dependency chain (check for circular dependencies)
     */
    validateDependencies(): boolean;
    /**
     * Get fields that can be loaded immediately (no dependencies)
     */
    getRootFields(): string[];
    /**
     * Get fields that can be loaded after dependencies are satisfied
     */
    getLoadableFields(satisfiedFields: Set<string>, getDependencyValue: (fieldName: string) => string | null): string[];
}
//# sourceMappingURL=DependencyManager.d.ts.map