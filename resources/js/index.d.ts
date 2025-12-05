/**
 * AtlasShop JavaScript Library
 * Main entry point for shop functionality
 */
export * from './core/Types';
export * from './core/Config';
export * from './core/ShopApiClient';
export * from './delivery/DeliveryMethodService';
export * from './delivery/DynamicFieldLoader';
export * from './delivery/SearchFieldHelper';
export * from './delivery/DependencyManager';
import { ShopApiClient } from './core/ShopApiClient';
import { DeliveryMethodService, EnhancedDeliveryMethodInfo } from './delivery/DeliveryMethodService';
import { ShopConfig, DependencyResolver } from './core/Types';
/**
 * Convenience function to initialize shop service
 */
export declare function createShopService(config?: Partial<ShopConfig>): {
    deliveryMethod: (deliveryMethodId: number) => DeliveryMethodService;
    apiClient: ShopApiClient;
    /**
     * Get enhanced delivery method info with dependency management
     */
    getDeliveryMethod(deliveryMethodId: number, dependencyResolver?: DependencyResolver): Promise<EnhancedDeliveryMethodInfo>;
};
//# sourceMappingURL=index.d.ts.map