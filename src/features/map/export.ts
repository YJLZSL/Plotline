export interface ExportMapOptions {
  filename?: string;
  scale?: number;
}

export interface PrintMapOptions {
  rootElement: HTMLElement;
}

/**
 * 将 SVG 元素序列化后绘制到 canvas，生成 PNG 并触发下载。
 * 返回生成的 PNG data URL，便于测试断言。
 */
export async function exportMapAsPng(
  svgElement: SVGSVGElement,
  options: ExportMapOptions = {},
): Promise<string> {
  const { filename = 'map.png', scale = 2 } = options;
  const rect = svgElement.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Canvas 2D context is not available');
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      const bg =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-base')
          .trim() || '#ffffff';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    image.onerror = () => {
      reject(new Error('Failed to load SVG into image'));
    };
    image.src = url;
  });

  const pngUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = pngUrl;
  link.click();
  URL.revokeObjectURL(url);
  return pngUrl;
}

/**
 * 进入地图打印模式：给 html 添加 `map-printing`，并给打印根节点添加
 * `map-print-root`，配合 themes.css 中的打印样式仅显示地图主容器。
 */
export function startMapPrintClass(rootElement: HTMLElement): void {
  document.documentElement.classList.add('map-printing');
  rootElement.classList.add('map-print-root');
}

/**
 * 退出地图打印模式，移除打印相关 class（幂等）。
 */
export function finishMapPrintClass(rootElement: HTMLElement): void {
  document.documentElement.classList.remove('map-printing');
  rootElement.classList.remove('map-print-root');
}

/**
 * 纯前端打印 / PDF 导出：隐藏地图以外的界面后调用浏览器打印。
 * 浏览器打印会阻塞 JS；afterprint 是主清理时机，next tick 与 2s
 * timeout 作为 jsdom / 打印对话框异常时的兜底。
 */
export async function printMapAsPdf(options: PrintMapOptions): Promise<void> {
  const { rootElement } = options;
  startMapPrintClass(rootElement);

  const cleanup = () => finishMapPrintClass(rootElement);
  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 0);
  window.setTimeout(cleanup, 2000);

  window.print();
}
