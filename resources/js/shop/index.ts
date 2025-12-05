/**
 * AtlasShop JavaScript Library
 * Main entry point for shop functionality
 */

// Core exports
export * from './core/Types';
export * from './core/Config';
export * from './core/ShopApiClient';

// Delivery exports
export * from './delivery/DeliveryMethodService';
export * from './delivery/DynamicFieldLoader';
export * from './delivery/SearchFieldHelper';
export * from './delivery/DependencyManager';

// Re-export types for convenience
import { ShopApiClient } from './core/ShopApiClient';
import { DeliveryMethodService, EnhancedDeliveryMethodInfo } from './delivery/DeliveryMethodService';
import { Config } from './core/Config';
import { ShopConfig, DependencyResolver } from './core/Types';

/**
 * Convenience function to initialize shop service
 */
export function createShopService(config?: Partial<ShopConfig>): {
    deliveryMethod: (deliveryMethodId: number) => DeliveryMethodService;
    apiClient: ShopApiClient;
    
    /**
     * Get enhanced delivery method info with dependency management
     */
    getDeliveryMethod(
        deliveryMethodId: number,
        dependencyResolver?: DependencyResolver
    ): Promise<EnhancedDeliveryMethodInfo>;
} {
    const apiClient = new ShopApiClient(config);
    const cfg = Config.getInstance();
    if (config) {
        cfg.setConfig(config);
    }

    return {
        deliveryMethod: (deliveryMethodId: number) => {
            return new DeliveryMethodService(apiClient, deliveryMethodId);
        },
        apiClient,
        async getDeliveryMethod(
            deliveryMethodId: number,
            dependencyResolver?: DependencyResolver
        ): Promise<EnhancedDeliveryMethodInfo> {
            const service = new DeliveryMethodService(apiClient, deliveryMethodId);
            return service.getFields(dependencyResolver);
        },
    };
}

