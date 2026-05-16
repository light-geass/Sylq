import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Add any custom rules here
      "@next/next/no-img-element": "warn" 
    }
  }
]);
