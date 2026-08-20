import { onUnmounted, ref } from 'vue';

export function useToast(duration = 2200) {
  const message = ref('');
  const visible = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function show(msg: string) {
    message.value = msg;
    visible.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      visible.value = false;
    }, duration);
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
  });

  return { message, visible, show };
}
