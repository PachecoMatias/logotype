import { register } from 'node:module';

register('./migration-lock-loader.mjs', import.meta.url);
