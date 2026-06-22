// 单一版本号来源：package.json
// 避免多个组件硬编码不同版本号导致发布不一致
import pkg from '../../package.json';

export const APP_VERSION = pkg.version;
