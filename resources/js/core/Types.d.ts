/**
 * Type definitions for AtlasShop JavaScript library
 */
export interface DeliveryMethodField {
    type: 'text' | 'select' | 'textarea' | 'hidden';
    label: string;
    required?: boolean;
    placeholder?: string;
    help_text?: string;
    options?: 'dynamic' | 'search' | string[] | Array<{
        value: string;
        label: string;
    }>;
    search_min_length?: number;
    depends_on?: string;
    rows?: number;
    validation?: string[];
    _name?: string;
    _deliveryMethodId?: number;
}
export interface EnhancedField extends DeliveryMethodField {
    /**
     * Get options for this field - works for both static and dynamic fields
     */
    getOptions(dependencyResolver?: DependencyResolver): Promise<FieldOption[]>;
    /**
     * Create search handler for search-based fields
     */
    createSearchHandler(onResults: (results: FieldOption[]) => void, onError?: (error: Error) => void, dependencyResolver?: DependencyResolver): (searchString: string) => void;
    /**
     * Check if this field has options (static or dynamic)
     */
    hasOptions(): boolean;
    /**
     * Check if options are static (available immediately)
     */
    hasStaticOptions(): boolean;
    /**
     * Check if options are dynamic (require API call)
     */
    hasDynamicOptions(): boolean;
    /**
     * Get fields this field depends on
     */
    getDependencies(): string[];
    /**
     * Get fields that depend on this field
     */
    getDependentFields(): string[];
}
export interface DeliveryMethodFields {
    [fieldName: string]: DeliveryMethodField;
}
export interface FieldOption {
    value: string;
    label: string;
    description?: string;
    address?: string;
}
export interface DeliveryMethodInfo {
    fields: DeliveryMethodFields;
    delivery_method_type: string;
    delivery_method_name: string;
}
export interface ShopConfig {
    apiBaseUrl?: string;
    csrfToken?: string;
}
export interface DependencyResolver {
    getValue(fieldName: string): string | null;
    getRefValue(fieldName: string): string | null;
}
//# sourceMappingURL=Types.d.ts.map