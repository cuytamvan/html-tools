import { escapeHtml } from '@/lib/escape';

export const SAMPLE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36';

export type UaPair = { name: string; version: string };
export type UaDevice = { type: string; vendor: string; model: string };
export type UaInfo = {
  browser: UaPair;
  engine: UaPair;
  os: UaPair;
  device: UaDevice;
};

export function match(ua: string, re: RegExp): string {
  const m = ua.match(re);
  return m ? m[1] : '';
}

export function parseUA(ua: string): UaInfo {
  ua = String(ua || '');
  const info: UaInfo = {
    browser: { name: '', version: '' },
    engine: { name: '', version: '' },
    os: { name: '', version: '' },
    device: { type: 'desktop', vendor: '', model: '' },
  };

  if (!ua.trim()) return info;

  if (/Googlebot|bingbot|Slurp|DuckDuckBot|facebookexternalhit|Twitterbot|YandexBot/i.test(ua)) {
    info.device.type = 'bot';
  } else if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    info.device.type = 'tablet';
  } else if (/Mobile|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    info.device.type = 'phone';
  }

  if (/Windows NT 10\.0/i.test(ua)) info.os = { name: 'Windows', version: '10 / 11' };
  else if (/Windows NT 6\.3/i.test(ua)) info.os = { name: 'Windows', version: '8.1' };
  else if (/Windows NT 6\.2/i.test(ua)) info.os = { name: 'Windows', version: '8' };
  else if (/Windows NT 6\.1/i.test(ua)) info.os = { name: 'Windows', version: '7' };
  else if (/Windows/i.test(ua)) info.os = { name: 'Windows', version: match(ua, /Windows NT ([\d.]+)/) };
  else if (/CrOS/i.test(ua)) info.os = { name: 'Chrome OS', version: match(ua, /CrOS \S+ ([\d.]+)/) };
  else if (/Android/i.test(ua)) info.os = { name: 'Android', version: match(ua, /Android ([\d.]+)/) };
  else if (/iPhone|iPad|iPod/i.test(ua)) {
    const ios = match(ua, /OS ([\d_]+)/).replace(/_/g, '.');
    info.os = { name: 'iOS', version: ios };
  } else if (/Mac OS X/i.test(ua)) {
    const mac = match(ua, /Mac OS X ([\d_]+)/).replace(/_/g, '.');
    info.os = { name: 'macOS', version: mac };
  } else if (/Linux/i.test(ua)) info.os = { name: 'Linux', version: '' };

  if (/iPhone/.test(ua)) {
    info.device.vendor = 'Apple';
    info.device.model = 'iPhone';
  } else if (/iPad/.test(ua)) {
    info.device.vendor = 'Apple';
    info.device.model = 'iPad';
  } else if (/Macintosh/.test(ua)) {
    info.device.vendor = 'Apple';
    info.device.model = 'Mac';
  } else if (/Android/.test(ua)) {
    const model = match(ua, /Android [\d.]+; ([^);]+)(?: Build|\)|; wv)/);
    if (model && !/^(wv|Mobile|U)$/i.test(model)) info.device.model = model.trim();
    if (/Pixel/i.test(ua)) info.device.vendor = 'Google';
    else if (/SM-|Samsung/i.test(ua)) info.device.vendor = 'Samsung';
  }

  if (/Edg(?:e|A|iOS)?\//.test(ua)) {
    info.browser = { name: 'Edge', version: match(ua, /Edg(?:e|A|iOS)?\/([\d.]+)/) };
  } else if (/OPR\/|Opera\//.test(ua)) {
    info.browser = { name: 'Opera', version: match(ua, /(?:OPR|Opera)\/([\d.]+)/) };
  } else if (/SamsungBrowser\//.test(ua)) {
    info.browser = { name: 'Samsung Internet', version: match(ua, /SamsungBrowser\/([\d.]+)/) };
  } else if (/Firefox\/|FxiOS\//.test(ua)) {
    info.browser = { name: 'Firefox', version: match(ua, /(?:Firefox|FxiOS)\/([\d.]+)/) };
  } else if (/Chrome\/|CriOS\//.test(ua)) {
    info.browser = { name: 'Chrome', version: match(ua, /(?:Chrome|CriOS)\/([\d.]+)/) };
  } else if (/Safari\//.test(ua) && /Version\//.test(ua)) {
    info.browser = { name: 'Safari', version: match(ua, /Version\/([\d.]+)/) };
  } else if (/MSIE |Trident\//.test(ua)) {
    info.browser = { name: 'Internet Explorer', version: match(ua, /(?:MSIE |rv:)([\d.]+)/) };
  }

  if (/Gecko\//.test(ua) && /Firefox\//.test(ua)) {
    info.engine = { name: 'Gecko', version: match(ua, /rv:([\d.]+)/) };
  } else if (/Chrome\//.test(ua) || /Edg\//.test(ua) || /OPR\//.test(ua)) {
    info.engine = { name: 'Blink', version: match(ua, /Chrome\/([\d.]+)/) };
  } else if (/AppleWebKit\//.test(ua)) {
    info.engine = { name: 'WebKit', version: match(ua, /AppleWebKit\/([\d.]+)/) };
  } else if (/Trident\//.test(ua)) {
    info.engine = { name: 'Trident', version: match(ua, /Trident\/([\d.]+)/) };
  }

  return info;
}

export function pair(name: string, version: string): string {
  if (!name) return '—';
  return version ? name + ' ' + version : name;
}

export function typeClass(type: string): string {
  if (type === 'phone') return 'tag blue';
  if (type === 'tablet') return 'tag green';
  if (type === 'bot') return 'tag red';
  return 'tag';
}

export function highlightUA(ua: string, info: UaInfo): string {
  if (!ua) return '';
  let html = escapeHtml(ua);
  const tokens = [info.browser.name, info.engine.name, info.os.name, info.device.model].filter(Boolean);
  tokens.forEach((tok) => {
    if (tok.length < 3) return;
    const re = new RegExp('(' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    html = html.replace(re, '<mark>$1</mark>');
  });
  return html;
}
