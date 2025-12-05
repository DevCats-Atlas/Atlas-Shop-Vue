/**
 * Configuration management for AtlasShop library
 */
export class Config {
    constructor() {
        this.config = {
            apiBaseUrl: '/api/shop',
            csrfToken: undefined,
        };
    }
    static getInstance() {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    getApiUrl(path) {
        const baseUrl = this.config.apiBaseUrl || '/api/shop';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    }
    getCsrfToken() {
        if (this.config.csrfToken) {
            return this.config.csrfToken;
        }
        // Try to get from meta tag
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    }
}
//# sourceMappingURL=Config.js.map