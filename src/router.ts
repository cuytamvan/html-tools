import { createRouter, createWebHashHistory } from 'vue-router';

export const Router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('@/pages/Index.vue'), meta: { landing: true, titleKey: 'app.title' } },
    { path: '/json-searcher', component: () => import('@/pages/JsonSearcher.vue'), meta: { titleKey: 'tools.jsonSearcher.title' } },
    { path: '/json-diff', component: () => import('@/pages/JsonDiff.vue'), meta: { titleKey: 'tools.jsonDiff.title' } },
    { path: '/json-types', component: () => import('@/pages/JsonTypes.vue'), meta: { titleKey: 'tools.jsonTypes.title' } },
    { path: '/csv-json', component: () => import('@/pages/CsvJson.vue'), meta: { titleKey: 'tools.csvJson.title' } },
    { path: '/overtime', component: () => import('@/pages/Overtime.vue'), meta: { titleKey: 'tools.overtime.title' } },
    { path: '/hashids', component: () => import('@/pages/Hashids.vue'), meta: { titleKey: 'tools.hashids.title' } },
    { path: '/regex-tester', component: () => import('@/pages/RegexTester.vue'), meta: { titleKey: 'tools.regexTester.title' } },
    { path: '/user-agent', component: () => import('@/pages/UserAgent.vue'), meta: { titleKey: 'tools.userAgent.title' } },
    { path: '/boilerplate', component: () => import('@/pages/Boilerplate.vue'), meta: { titleKey: 'tools.boilerplate.title' } },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});
