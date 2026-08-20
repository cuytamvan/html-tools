import { createApp } from 'vue';

import App from './App.vue';
import { Router } from './router';

import { registerPwa } from './pwa';

import './styles/global.css';
import './styles/landing.css';

createApp(App).use(Router).mount('#app');
registerPwa();
