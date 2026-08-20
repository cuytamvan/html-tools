import { onMounted } from 'vue';

export function usePageTitle(title: string): void {
  onMounted(() => {
    document.title = title;
  });
}
