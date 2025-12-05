import { ShopApiClient } from '../core/ShopApiClient';
import { DependencyManager } from './DependencyManager';
import { DeliveryMethodField, DeliveryMethodFields, DeliveryMethodInfo, DependencyResolver } from '../core/Types';
import { EnhancedField } from '../core/Types';
/**
 * Service for getting delivery method information with enhanced field functionality
 */
export declare class DeliveryMethodService {
    private apiClient;
    private deliveryMethodId;
    private fieldLoader?;
    private searchHelper?;
    private dependencyManager?;
    constructor(apiClient: ShopApiClient, deliveryMethodId: number);
    /**
     * Get field definitions for a delivery method
     * Returns enhanced fields with dependency information and helper methods
     */
    getFields(dependencyResolver?: DependencyResolver): Promise<EnhancedDeliveryMethodInfo>;
    /**
     * Create an enhanced field with helper methods
     */
    private createEnhancedField;
    /**
     * Get static options from field definition
     */
    private getStaticOptions;
    /**
     * Check if a field has dynamic options
     */
    hasDynamicOptions(field: DeliveryMethodField): boolean;
    /**
     * Check if a field is search-based
     */
    isSearchField(field: DeliveryMethodField): boolean;
    /**
     * Get fields that depend on a given field
     */
    getDependentFields(fields: DeliveryMethodFields, fieldName: string): string[];
    /**
     * Build dependency chain for a field (all fields it depends on)
     */
    getDependencyChain(fields: DeliveryMethodFields, fieldName: string): string[];
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
//# sourceMappingURL=DeliveryMethodService.d.ts.map