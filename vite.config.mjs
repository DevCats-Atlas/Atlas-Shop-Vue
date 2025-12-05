/**
 * AtlasShop-Vue Vite Configuration
 * 
 * This file exports the package's Vite configuration including:
 * - Resource files (admin Vue components only)
 * - Path aliases for imports
 * 
 * Note: Frontend demo resources (JS/CSS) are in the AtlasShop package, not here.
 * This package only contains admin panel Vue components.
 * 
 * This config is automatically loaded by the root vite.config.js
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    // Resource files to include in Vite build (admin only)
    resources: [
        // No frontend resources - they're in AtlasShop package
    ],
    
    // Path aliases for this package
    aliases: {
        '@atlasshop/admin': path.resolve(__dirname, 'resources/admin'),
    },
};

