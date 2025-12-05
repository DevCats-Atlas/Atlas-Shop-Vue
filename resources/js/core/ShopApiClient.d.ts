import { DeliveryMethodInfo, FieldOption, ShopConfig } from './Types';
/**
 * API client for communicating with shop API endpoints
 */
export declare class ShopApiClient {
    private config;
    constructor(config?: Partial<ShopConfig>);
    /**
     * Get delivery method field definitions
     */
    getDeliveryMethodFields(deliveryMethodId: number): Promise<DeliveryMethodInfo>;
    /**
     * Get options for a dynamic field
     */
    getFieldOptions(deliveryMethodId: number, fieldName: string, options?: {
        dependencies?: Record<string, string>;
        searchString?: string;
        limit?: number;
    }): Promise<FieldOption[]>;
    /**
     * Make HTTP request
     */
    private request;
}
//# sourceMappingURL=ShopApiClient.d.ts.map