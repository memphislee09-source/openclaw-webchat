# Architecture Draft — openclaw-webchat

## 目标
建立可演进的前端工程骨架，优先保障稳定性、可维护性和可测试性。

## 初始建议（待确认）
- 前端框架：React + TypeScript
- 构建工具：Vite
- 状态管理：轻量全局状态 + 局部状态优先
- 网络层：统一 API Client + 错误拦截
- UI 设计：组件化分层（页面/模块/基础组件）

## 分层草案
1. `app`：应用入口与路由
2. `features`：按业务域组织（chat/session/settings）
3. `shared`：通用组件、工具函数、hooks
4. `infra`：网络、日志、配置

## 质量基线
- TypeScript 严格模式
- 基础单测覆盖核心逻辑
- 提交前 lint + typecheck

