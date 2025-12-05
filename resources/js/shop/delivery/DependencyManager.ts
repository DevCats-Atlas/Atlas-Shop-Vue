import { DeliveryMethodFields } from '../core/Types';

/**
 * Manages field dependencies and relationships
 */
export class DependencyManager {
    private dependencyGraph: Map<string, string[]> = new Map();

    constructor(private fields: DeliveryMethodFields) {
        this.buildDependencyGraph();
    }

    /**
     * Build dependency graph from field definitions
     */
    private buildDependencyGraph(): void {
        Object.keys(this.fields).forEach(fieldName => {
            const field = this.fields[fieldName];
            if (field.depends_on) {
                if (!this.dependencyGraph.has(fieldName)) {
                    this.dependencyGraph.set(fieldName, []);
                }
                this.dependencyGraph.get(fieldName)!.push(field.depends_on);
            }
        });
    }

    /**
     * Get all fields that a field depends on (transitive dependencies)
     * Example: delivery_point -> [city, region] (city depends on region)
     */
    getDependencyChain(fieldName: string): string[] {
        const chain: string[] = [];
        const visited = new Set<string>();

        const traverse = (name: string): void => {
            if (visited.has(name)) return;
            visited.add(name);

            const dependencies = this.dependencyGraph.get(name) || [];
            dependencies.forEach(dep => {
                if (!chain.includes(dep)) {
                    chain.push(dep);
                }
                traverse(dep);
            });
        };

        traverse(fieldName);
        return chain;
    }

    /**
     * Get all fields that depend on a given field
     */
    getDependentFields(fieldName: string): string[] {
        const dependents: string[] = [];

        this.dependencyGraph.forEach((deps, field) => {
            if (deps.includes(fieldName)) {
                dependents.push(field);
            }
        });

        return dependents;
    }

    /**
     * Get dependency graph
     */
    getDependencyGraph(): Map<string, string[]> {
        return new Map(this.dependencyGraph);
    }

    /**
     * Validate dependency chain (check for circular dependencies)
     */
    validateDependencies(): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (fieldName: string): boolean => {
            visited.add(fieldName);
            recursionStack.add(fieldName);

            const dependencies = this.dependencyGraph.get(fieldName) || [];
            for (const dep of dependencies) {
                if (!visited.has(dep)) {
                    if (hasCycle(dep)) return true;
                } else if (recursionStack.has(dep)) {
                    return true;
                }
            }

            recursionStack.delete(fieldName);
            return false;
        };

        for (const fieldName of Object.keys(this.fields)) {
            if (!visited.has(fieldName)) {
                if (hasCycle(fieldName)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get fields that can be loaded immediately (no dependencies)
     */
    getRootFields(): string[] {
        return Object.keys(this.fields).filter(fieldName => {
            return !this.dependencyGraph.has(fieldName) || 
                   this.dependencyGraph.get(fieldName)!.length === 0;
        });
    }

    /**
     * Get fields that can be loaded after dependencies are satisfied
     */
    getLoadableFields(
        satisfiedFields: Set<string>,
        getDependencyValue: (fieldName: string) => string | null
    ): string[] {
        const loadable: string[] = [];

        this.dependencyGraph.forEach((deps, fieldName) => {
            if (satisfiedFields.has(fieldName)) {
                return; // Already loaded
            }

            const allDepsSatisfied = deps.every(dep => {
                return satisfiedFields.has(dep) && getDependencyValue(dep) !== null;
            });

            if (allDepsSatisfied) {
                loadable.push(fieldName);
            }
        });

        // Also include fields not in dependency graph
        Object.keys(this.fields).forEach(fieldName => {
            if (!this.dependencyGraph.has(fieldName) && !satisfiedFields.has(fieldName)) {
                loadable.push(fieldName);
            }
        });

        return loadable;
    }
}

