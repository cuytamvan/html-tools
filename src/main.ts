import { createApp } from 'vue';

import App from './App.vue';
import { applyDocumentLang, i18n } from './i18n';
import { Router } from './router';

import { registerPwa } from './pwa';

import './styles/global.css';
import './styles/landing.css';

applyDocumentLang();
createApp(App).use(i18n).use(Router).mount('#app');
registerPwa();
