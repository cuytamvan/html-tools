import { createRouter, createWebHashHistory } from 'vue-router';

export const Router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('@/pages/Index.vue'), meta: { landing: true, title: 'HTML Tools' } },
    { path: '/json-searcher', component: () => import('@/pages/JsonSearcher.vue'), meta: { title: 'JSON Searcher' } },
    { path: '/json-diff', component: () => import('@/pages/JsonDiff.vue'), meta: { title: 'JSON Diff' } },
    { path: '/json-types', component: () => import('@/pages/JsonTypes.vue'), meta: { title: 'JSON ke Tipe' } },
    { path: '/csv-json', component: () => import('@/pages/CsvJson.vue'), meta: { title: 'CSV / JSON' } },
    { path: '/overtime', component: () => import('@/pages/Overtime.vue'), meta: { title: 'Perhitungan Lembur' } },
    { path: '/hashids', component: () => import('@/pages/Hashids.vue'), meta: { title: 'Hashids' } },
    { path: '/regex-tester', component: () => import('@/pages/RegexTester.vue'), meta: { title: 'Regex Tester' } },
    { path: '/user-agent', component: () => import('@/pages/UserAgent.vue'), meta: { title: 'User Agent Parser' } },
    { path: '/boilerplate', component: () => import('@/pages/Boilerplate.vue'), meta: { title: 'Boilerplate' } },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

Router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'HTML Tools';
  document.title = title;
});
