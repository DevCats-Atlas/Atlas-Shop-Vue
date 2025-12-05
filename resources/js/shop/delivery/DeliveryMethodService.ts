import { ShopApiClient } from '../core/ShopApiClient';
import { DependencyManager } from './DependencyManager';
import { DynamicFieldLoader } from './DynamicFieldLoader';
import { SearchFieldHelper } from './SearchFieldHelper';
import {
    DeliveryMethodField,
    DeliveryMethodFields,
    DeliveryMethodInfo,
    DependencyResolver,
    FieldOption,
} from '../core/Types';
import { EnhancedField } from '../core/Types';

/**
 * Service for getting delivery method information with enhanced field functionality
 */
export class DeliveryMethodService {
    private fieldLoader?: DynamicFieldLoader;
    private searchHelper?: SearchFieldHelper;
    private dependencyManager?: DependencyManager;

    constructor(
        private apiClient: ShopApiClient,
        private deliveryMethodId: number
    ) {}

    /**
     * Get field definitions for a delivery method
     * Returns enhanced fields with dependency information and helper methods
     */
    async getFields(dependencyResolver?: DependencyResolver): Promise<EnhancedDeliveryMethodInfo> {
        const methodInfo = await this.apiClient.getDeliveryMethodFields(this.deliveryMethodId);

        // Initialize helpers
        this.fieldLoader = new DynamicFieldLoader(
            this.apiClient,
            this.deliveryMethodId,
            methodInfo.fields
        );
        this.searchHelper = new SearchFieldHelper(
            this.apiClient,
            this.deliveryMethodId,
            methodInfo.fields
        );
        this.dependencyManager = new DependencyManager(methodInfo.fields);

        // Enhance fields with methods
        const enhancedFields: EnhancedDeliveryMethodFields = {};
        Object.keys(methodInfo.fields).forEach(fieldName => {
            enhancedFields[fieldName] = this.createEnhancedField(
                fieldName,
                methodInfo.fields[fieldName],
                methodInfo.fields
            );
        });

        return {
            ...methodInfo,
            fields: enhancedFields,
            dependencyManager: this.dependencyManager,
            getField: (fieldName: string) => enhancedFields[fieldName] || null,
            resolveDependencies: (fieldName: string, resolver: DependencyResolver) => {
                return this.fieldLoader!.resolveDependencies(fieldName, resolver);
            },
        };
    }

    /**
     * Create an enhanced field with helper methods
     */
    private createEnhancedField(
        fieldName: string,
        field: DeliveryMethodField,
        allFields: DeliveryMethodFields
    ): EnhancedField {
        return {
            ...field,
            _name: fieldName,
            _deliveryMethodId: this.deliveryMethodId,

            getOptions: async (dependencyResolver?: DependencyResolver): Promise<FieldOption[]> => {
                // For static options, return immediately
                if (Array.isArray(field.options) && field.options.length > 0) {
                    return this.getStaticOptions(field);
                }

                // For dynamic options, load from API
                if (field.options === 'dynamic') {
                    return this.fieldLoader!.loadOptions(fieldName, dependencyResolver);
                }

                // For search fields, return empty array
                return [];
            },

            createSearchHandler: (
                onResults: (results: FieldOption[]) => void,
                onError?: (error: Error) => void,
                dependencyResolver?: DependencyResolver
            ) => {
                if (!this.isSearchField(field)) {
                    throw new Error(`Field ${fieldName} is not a search field`);
                }

                return this.searchHelper!.createSearchHandler(fieldName, {
                    searchMinLength: field.search_min_length,
                    limit: 100,
                    onResults,
                    onError,
                    dependencyResolver,
                });
            },

            hasOptions: (): boolean => {
                return (Array.isArray(field.options) && field.options.length > 0) || 
                       field.options === 'dynamic';
            },

            hasStaticOptions: (): boolean => {
                return Array.isArray(field.options) && field.options.length > 0;
            },

            hasDynamicOptions: (): boolean => {
                return field.options === 'dynamic';
            },

            getDependencies: (): string[] => {
                if (!field.depends_on) return [];
                return this.dependencyManager!.getDependencyChain(fieldName);
            },

            getDependentFields: (): string[] => {
                return this.dependencyManager!.getDependentFields(fieldName);
            },
        };
    }

    /**
     * Get static options from field definition
     */
    private getStaticOptions(field: DeliveryMethodField): FieldOption[] {
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
    hasDynamicOptions(field: DeliveryMethodField): boolean {
        return field.options === 'dynamic';
    }

    /**
     * Check if a field is search-based
     */
    isSearchField(field: DeliveryMethodField): boolean {
        return field.options === 'search';
    }

    /**
     * Get fields that depend on a given field
     */
    getDependentFields(fields: DeliveryMethodFields, fieldName: string): string[] {
        const manager = new DependencyManager(fields);
        return manager.getDependentFields(fieldName);
    }

    /**
     * Build dependency chain for a field (all fields it depends on)
     */
    getDependencyChain(fields: DeliveryMethodFields, fieldName: string): string[] {
        const manager = new DependencyManager(fields);
        return manager.getDependencyChain(fieldName);
    }
}

export interface EnhancedDeliveryMethodFields {
    [fieldName: string]: EnhancedField;
}

export interface EnhancedDeliveryMethodInfo extends DeliveryMethodInfo {
    fields: EnhancedDeliveryMethodFields;
    dependencyManager: DependencyManager;
    getField(fieldName: string): EnhancedField | null;
    resolveDependencies(fieldName: string, dependencyResolver: DependencyResolver): Record<string, string>;
}

