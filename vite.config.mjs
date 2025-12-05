/**
 * AtlasShop-Vue Vite Configuration
 * 
 * This file exports the package's Vite configuration including:
 * - Resource files (CSS, JS) to include in the build
 * - Path aliases for imports
 * 
 * This config is automatically loaded by the root vite.config.js
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    // Resource files to include in Vite build
    resources: [
        { type: 'css', file: 'resources/css/shop.css', context: 'frontend' },
        { type: 'js', file: 'resources/js/shop.js', context: 'frontend' },
    ],
    
    // Path aliases for this package
    aliases: {
        '@atlasshop/admin': path.resolve(__dirname, 'resources/admin'),
        '@atlasshop/frontend': path.resolve(__dirname, 'resources'),
    },
};

