import { Config } from './Config';
/**
 * API client for communicating with shop API endpoints
 */
export class ShopApiClient {
    constructor(config) {
        this.config = Config.getInstance();
        if (config) {
            this.config.setConfig(config);
        }
    }
    /**
     * Get delivery method field definitions
     */
    async getDeliveryMethodFields(deliveryMethodId) {
        const url = this.config.getApiUrl(`/delivery-methods/${deliveryMethodId}/fields`);
        const response = await this.request(url);
        return response;
    }
    /**
     * Get options for a dynamic field
     */
    async getFieldOptions(deliveryMethodId, fieldName, options) {
        const url = this.config.getApiUrl(`/delivery-methods/${deliveryMethodId}/field-options/${fieldName}`);
        const queryParams = new URLSearchParams();
        if (options?.dependencies && Object.keys(options.dependencies).length > 0) {
            queryParams.append('dependencies', JSON.stringify(options.dependencies));
        }
        if (options?.searchString) {
            queryParams.append('search', options.searchString);
        }
        if (options?.limit) {
            queryParams.append('limit', options.limit.toString());
        }
        const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;
        const response = await this.request(fullUrl);
        if (!response.success || !response.options) {
            throw new Error(response.message || 'Failed to fetch field options');
        }
        return response.options;
    }
    /**
     * Make HTTP request
     */
    async request(url, options) {
        const csrfToken = this.config.getCsrfToken();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options?.headers,
        };
        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=ShopApiClient.js.map