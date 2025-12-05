import { ShopConfig } from './Types';

/**
 * Configuration management for AtlasShop library
 */
export class Config {
    private static instance: Config;
    private config: ShopConfig;

    private constructor() {
        this.config = {
            apiBaseUrl: '/api/shop',
            csrfToken: undefined,
        };
    }

    static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    setConfig(config: Partial<ShopConfig>): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): ShopConfig {
        return { ...this.config };
    }

    getApiUrl(path: string): string {
        const baseUrl = this.config.apiBaseUrl || '/api/shop';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    }

    getCsrfToken(): string | null {
        if (this.config.csrfToken) {
            return this.config.csrfToken;
        }
        // Try to get from meta tag
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    }
}

