import { ShopApiClient } from '../core/ShopApiClient';
import { DeliveryMethodFields, DependencyResolver, FieldOption } from '../core/Types';

/**
 * Service for loading dynamic field options
 */
export class DynamicFieldLoader {
    constructor(
        private apiClient: ShopApiClient,
        private deliveryMethodId: number,
        private fields: DeliveryMethodFields
    ) {}

    /**
     * Load options for a dynamic select field
     * Automatically resolves dependencies using dependencyResolver
     */
    async loadOptions(
        fieldName: string,
        dependencyResolver?: DependencyResolver
    ): Promise<FieldOption[]> {
        const dependencies = dependencyResolver 
            ? this.resolveDependencies(fieldName, dependencyResolver)
            : {};

        return this.loadOptionsWithDependencies(fieldName, dependencies);
    }

    /**
     * Load options with explicit dependencies (advanced usage)
     */
    async loadOptionsWithDependencies(
        fieldName: string,
        dependencies: Record<string, string>
    ): Promise<FieldOption[]> {
        return this.apiClient.getFieldOptions(this.deliveryMethodId, fieldName, {
            dependencies,
        });
    }

    /**
     * Resolve all dependencies for a field
     * Traverses dependency chain (e.g., city -> region, delivery_point -> city -> region)
     */
    resolveDependencies(
        fieldName: string,
        dependencyResolver: DependencyResolver
    ): Record<string, string> {
        const field = this.fields[fieldName];
        if (!field || !field.depends_on) {
            return {};
        }

        const resolved: Record<string, string> = {};
        const dependencyChain = this.getDependencyChain(fieldName);

        dependencyChain.forEach(depFieldName => {
            const depField = this.fields[depFieldName];
            if (!depField) return;

            // Try to get ref value first (for fields with _ref), then regular value
            let value = dependencyResolver.getRefValue(depFieldName);
            if (!value) {
                value = dependencyResolver.getValue(depFieldName);
            }

            if (value) {
                resolved[depFieldName] = value;
            }
        });

        // Also check direct dependency
        if (field.depends_on) {
            const directValue = dependencyResolver.getRefValue(field.depends_on) ||
                               dependencyResolver.getValue(field.depends_on);
            if (directValue) {
                resolved[field.depends_on] = directValue;
            }
        }

        return resolved;
    }

    /**
     * Get dependency chain for a field
     */
    private getDependencyChain(fieldName: string): string[] {
        const chain: string[] = [];
        const visited = new Set<string>();

        const traverse = (name: string): void => {
            if (visited.has(name)) return;
            visited.add(name);

            const field = this.fields[name];
            if (field?.depends_on) {
                if (!chain.includes(field.depends_on)) {
                    chain.push(field.depends_on);
                }
                traverse(field.depends_on);
            }
        };

        traverse(fieldName);
        return chain;
    }

    /**
     * Check if all required dependencies are available
     */
    hasAllDependencies(
        fieldName: string,
        dependencyResolver: DependencyResolver
    ): boolean {
        const field = this.fields[fieldName];
        if (!field || !field.depends_on) {
            return true;
        }

        const dependencies = this.resolveDependencies(fieldName, dependencyResolver);
        const requiredDeps = this.getDependencyChain(fieldName);
        
        if (field.depends_on && !requiredDeps.includes(field.depends_on)) {
            requiredDeps.push(field.depends_on);
        }

        return requiredDeps.every(dep => dependencies[dep] !== undefined);
    }

    /**
     * Get missing dependencies for a field
     */
    getMissingDependencies(
        fieldName: string,
        dependencyResolver: DependencyResolver
    ): string[] {
        const field = this.fields[fieldName];
        if (!field || !field.depends_on) {
            return [];
        }

        const dependencies = this.resolveDependencies(fieldName, dependencyResolver);
        const requiredDeps = this.getDependencyChain(fieldName);
        
        if (field.depends_on && !requiredDeps.includes(field.depends_on)) {
            requiredDeps.push(field.depends_on);
        }

        return requiredDeps.filter(dep => !dependencies[dep]);
    }
}

