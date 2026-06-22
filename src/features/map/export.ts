export interface ExportMapOptions {
  filename?: string;
  scale?: number;
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
