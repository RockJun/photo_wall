# photo_wall — 动态照片墙

一个全屏动态照片墙应用：不规则无缝拼贴展示照片，支持 3D 翻转 / 淡入淡出自动换图，可作为屏保或展厅/指挥中心的电视墙。前后端一体（Vite + React + Express），开箱即用。

## 功能特性

- **不规则无缝拼贴**：网格支持 `2×2 / 3×3 / 4×3 / 3×4 / 4×4 / 5×5` 多种预设，通过合并单元格（横图 2×1、竖图 1×2、大图 2×2、方图 1×1）打破整齐感，图片之间零间距填满屏幕
- **自动换图**：三种模式可切换
  - 逐个渐变（默认）：每拍随机替换一小批格子，错落淡入淡出
  - 整墙刷新：所有格子一起换新图
  - 随机弹出：随机挑 1~3 个格子直接替换
- **多种切换动效**：换图时随机使用水平翻转 / 垂直翻转 / 缩放淡入淡出 / 交叉淡入 / 滑动 / 马赛克，营造"活着的照片墙"
- **Ken Burns 常驻动效**：每张图片持续缓慢缩放平移，换图间隙画面依然灵动
- **时钟 + 日期 + 天气叠加**：右上角玻璃风卡片展示时间、日期、天气与空气质量（可选，可自定义城市）
- **图片加载优化**：懒加载 + 预加载 + 加载失败兜底，大量图片下依然流畅
- **本地图片**：支持本地上传（持久化到 `data/uploads`）+ 自动扫描外部图库目录（默认用户主目录下的「图片」文件夹），混合轮播
- **网络图源**：可选开启 Picsum 真实网络图（默认关闭，离线可用本地渐变占位）
- **屏保效果**：基于 `requestAnimationFrame` 驱动，鼠标移出页面也持续自动换图
- **控制面板**：左侧吸附齿轮滑出玻璃风控制台，可调网格尺寸、切换模式、间隔、网络图占比、时钟/天气开关、天气城市、上传/删除本地图等，配置自动持久化到 localStorage

## 技术栈

- **前端**：Vite 5 + React 18 + TypeScript + Tailwind CSS
- **后端**：Node.js + Express + multer
- **进程管理**：concurrently 同时启动前端与后端

## 快速开始

```bash
# 安装依赖
npm install

# 启动（前端 http://localhost:5173 ，后端 http://localhost:3001）
npm run dev
```

打开 `http://localhost:5173` 即可看到照片墙。鼠标移到屏幕左缘滑出设置齿轮，可打开控制面板调整布局与换图设置。

## 项目结构

```
photo_wall/
├── index.html              # Vite 入口
├── vite.config.ts          # Vite 配置（dev 代理 /api /uploads /ext 到后端）
├── server/                 # Express 后端
│   ├── index.ts            # 启动与静态服务（/uploads、/ext）
│   ├── storage.ts          # 上传落盘、外部图库扫描
│   └── routes/images.ts    # /api/images 列表、/api/upload 上传、删除接口
└── src/                    # React 前端
    ├── App.tsx             # 组装照片墙 + 控制面板 + 时钟叠加，初始化换图引擎
    ├── components/         # Wall（网格）、WallCell（动效卡片）、ControlPanel、ClockOverlay
    ├── engine/             # WallEngine 基类 + 三种换图模式
    ├── services/           # api、imagePool、placeholder（占位图）
    └── hooks/              # useWallConfig（localStorage）、useImagePool
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 后端端口 | `3001` |
| `EXTERNAL_IMAGE_DIR` | 外部图库目录（启动时自动扫描其中的图片） | 用户主目录下「图片」文件夹 |

## 配置说明

- 图片通过 `/api/images` 合并返回「上传图（`/uploads/*`）」+「外部图库（`/ext/*`）」
- 控制面板参数（模式、网格、间隔、网络图占比等）保存在浏览器 `localStorage`
- 上传图片默认限制：`image/*` 类型、单文件 10MB

## 许可证

[MIT](./LICENSE)
