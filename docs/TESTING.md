# 测试流程（Testing）

> 本文档定义 Plotline 的测试策略、运行命令、覆盖率要求与最佳实践。
> 任何代码改动都必须保证 `pnpm test` 与 `cargo test` 全绿。

---

## 一、测试金字塔

```
        ┌───────────┐
        │   E2E     │   Playwright，覆盖关键用户流程
        │  (~10%)   │   运行慢、价值高
        ├───────────┤
        │ Integration│   Vitest + RTL，组件级集成
        │  (~30%)    │
        ├───────────┤
        │  Unit     │   Vitest（前端）+ cargo test（后端）
        │  (~60%)   │   快速、确定性
        └───────────┘
```

---

## 二、命令速查

```bash
# 前端
pnpm test              # watch 模式单元测试
pnpm test:run          # 单次运行单元测试（CI）
pnpm test:coverage     # 生成覆盖率报告
pnpm test:e2e          # 启动 dev server + Playwright

# 后端
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture

# 代码质量
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit
pnpm format            # Prettier 写入
pnpm format:check      # Prettier 校验
```

---

## 三、前端单元测试（Vitest）

### 3.1 配置
- 测试框架：Vitest + jsdom
- DOM 断言：`@testing-library/jest-dom`
- 路径别名：`@/*` → `src/*`
- 配置文件：`vitest.config.ts`（与 vite 共用别名）

### 3.2 文件组织
- 测试文件与被测文件**同目录**：`Component.tsx` → `Component.test.tsx`
- 命名：`<被测文件名>.test.ts(x)`
- 每个 `features/<domain>/` 至少 1 个测试文件

### 3.3 编写原则
- **测试行为，而非实现**：用 `getByRole`、`getByText`，避免 `getByTestId` 当依赖实现细节。
- **避免快照测试**：除非 UI 完全静态，否则用语义断言。
- **mock IPC**：禁止真实调用 Tauri，统一 `vi.mock('@/features/<domain>/api')`。
- **时间确定性**：用 `vi.useFakeTimers()` 替代真实等待。
- **命名**：`it('should <期望行为> when <条件>')`

### 3.4 示例
```ts
// src/features/workspace/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listWorkspaces } from './api';

vi.mock('@/lib/ipc', () => ({
  invoke: vi.fn(),
}));

describe('listWorkspaces', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return workspaces when ipc resolves', async () => {
    const { invoke } = await import('@/lib/ipc');
    vi.mocked(invoke).mockResolvedValue([{ id: '1', name: 'demo' }]);
    const result = await listWorkspaces();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('demo');
  });

  it('should throw when ipc rejects', async () => {
    const { invoke } = await import('@/lib/ipc');
    vi.mocked(invoke).mockRejectedValue(new Error('db locked'));
    await expect(listWorkspaces()).rejects.toThrow('db locked');
  });
});
```

---

## 四、Rust 测试

### 4.1 配置
- 单元测试放在每个文件底部的 `#[cfg(test)] mod tests { ... }`。
- 集成测试放在 `src-tauri/tests/` 目录。
- 用 `tempfile` 创建临时数据库，避免污染本地数据。

### 4.2 示例
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn test_db() -> Connection {
        let file = NamedTempFile::new().unwrap();
        let conn = Connection::open(file.path()).unwrap();
        crate::db::migrate(&conn).unwrap();
        conn
    }

    #[test]
    fn should_create_workspace() {
        let conn = test_db();
        let ws = create_workspace(&conn, "测试").unwrap();
        assert_eq!(ws.name, "测试");
    }
}
```

---

## 五、E2E 测试（Playwright）

### 5.1 范围
仅覆盖关键用户流程（KPI），不重复单元测试已覆盖的逻辑：
1. 启动 → 创建工作区 → 进入时间轴
2. 添加轨道 → 添加事件 → 编辑事件
3. 创建角色 → 关联到事件
4. 切换视图（时间轴/角色/大纲/统计）
5. 导出 JSON

### 5.2 配置
- `playwright.config.ts` 中指定 baseURL、浏览器（Chromium）、超时。
- 测试在 `tests/e2e/` 目录，命名 `<flow>.spec.ts`。
- 使用 `data-testid` 标记关键交互节点。

### 5.3 注意
- **Tauri 环境**：E2E 在纯 web 模式下运行（`pnpm dev:web`），mock IPC 层。
- 不依赖真实文件系统，用 `page.evaluate` 注入 mock 数据。

---

## 六、覆盖率要求

- **业务逻辑**（`src/features/*/api.ts`、`src-tauri/src/services/`）：≥ 80%
- **UI 组件**（`src/components/ui/`）：≥ 60%
- **视图组件**（`src/components/views/`）：≥ 40%
- **整体**：≥ 70%

CI 在覆盖率下降超过 2% 时阻断合并。

---

## 七、CI 集成

`.github/workflows/ci.yml`：
1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test:run`
5. `cargo test --manifest-path src-tauri/Cargo.toml`
6. `pnpm build`

PR 必须全部通过才能合并。

---

## 八、测试清单（开发新功能时）

- [ ] 单元测试覆盖核心逻辑（happy path + 1 个错误分支）
- [ ] 边界情况：空输入、超长字符串、特殊字符
- [ ] mock IPC 调用，不依赖真实后端
- [ ] 测试文件与被测文件同目录
- [ ] `pnpm test:run` 全绿
- [ ] 若新增关键流程，添加 E2E 用例

---

> 文档版本：v1.0.0  
> 最后更新：2026-06-22
