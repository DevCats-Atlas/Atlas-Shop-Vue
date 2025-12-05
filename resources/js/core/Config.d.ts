import { ShopConfig } from './Types';
/**
 * Configuration management for AtlasShop library
 */
export declare class Config {
    private static instance;
    private config;
    private constructor();
    static getInstance(): Config;
    setConfig(config: Partial<ShopConfig>): void;
    getConfig(): ShopConfig;
    getApiUrl(path: string): string;
    getCsrfToken(): string | null;
}
//# sourceMappingURL=Config.d.ts.map