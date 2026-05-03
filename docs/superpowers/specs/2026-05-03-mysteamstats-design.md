# MySteamStats 产品设计规格

## 概述

MySteamStats 是一个公开的 Steam 游戏数据分析平台。用户通过 Steam OpenID 登录，系统拉取其公开游戏库数据，提供星系视图可视化、AI 性格锐评、评测风格分析和智能游戏推荐。

**开源策略**: 代码在 GitHub 开源，Docker Compose 一键部署。作者租用服务器运营一个月后停止，后续用户可自行本地搭建。

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript |
| ORM | Prisma |
| 数据库 | PostgreSQL |
| 认证 | Steam OpenID (纯 Steam 登录，无需注册) |
| AI 服务 | DeepSeek API (便宜、中文友好) |
| 可视化 | Three.js / D3.js (星系视图) |
| 部署 | Docker Compose (App + PostgreSQL 双容器) |

## 功能清单 (MVP)

### 1. Steam 一键登录
- Steam OpenID OAuth 2.0 流程
- 无需邮箱注册，纯 Steam 账号体系
- 登录后自动同步游戏库数据
- 数据来源: Steam 公开档案 (后续可选 Steam API Key 深度模式)

### 2. 游戏库展示 (Dashboard)
- 总览: 游戏总数、总时长、近两周时长
- 游戏列表: 封面、名称、时长、最后游玩时间
- 多维排序: 按时长、最近游玩、游戏名
- 筛选: 按类型标签
- 搜索: 按游戏名搜索

### 3. 星系视图 (封面可视化)
- **视觉形式**: 星球环绕型 — 中心为 Steam 头像发光球，游戏封面像行星环绕
- **规则**: 时长越长 → 离中心越近、封面越大
- **交互**: 3D 拖拽旋转、缩放、悬停显示详情、点击进详情
- **技术**: Three.js 力导向 3D 场景

### 4. AI 玩家锐评
- **风格**: 混合型 — 理性分析为主，穿插幽默吐槽金句
- **内容**: 游戏偏好分析、类型倾向、时间分配模式、玩家画像
- **实现**: 游戏库数据 JSON → DeepSeek API → 结构化锐评渲染
- **缓存**: 生成后存入数据库，用户可手动刷新

### 5. 评测风格分析
- 抓取玩家在 Steam 上写的游戏评测文本
- AI 分析评价风格、语言习惯、偏好倾向
- 后续扩展: MBTI 人格标签

### 6. 智能游戏推荐
- **规则初筛**: 基于时长、标签相似度、最近游玩时间，筛选 5 个候选
- **AI 精排**: 候选列表发送给 DeepSeek，生成排序和推荐理由
- **展示**: 推荐卡片 + AI 写的个性化推荐理由

## 页面结构

| 路由 | 页面 | 权限 |
|------|------|------|
| `/` | 首页 — 项目介绍 + Steam 登录按钮 | 公开 |
| `/dashboard` | 数据总览 + 游戏库列表 | 需登录 |
| `/galaxy` | 星球环绕封面可视化 | 需登录 |
| `/analysis` | AI 锐评 / 评测分析 / MBTI (Tab) | 需登录 |
| `/recommend` | 智能游戏推荐 | 需登录 |
| `/api/auth/*` | Steam 认证回调 | 公开 |

## 数据模型

### User
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| steamId | String (unique) | Steam 64位 ID |
| displayName | String | Steam 昵称 |
| avatarUrl | String | Steam 头像 URL |
| profileUrl | String | Steam 个人资料链接 |
| lastSyncAt | DateTime | 上次数据同步时间 |

### Game (全局共享)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| steamAppId | Int (unique) | Steam App ID |
| name | String | 游戏名称 |
| coverUrl | String | 封面图 CDN |
| headerUrl | String | 大横幅 |
| genres | String[] | 类型标签 |

### UserGame (用户-游戏关联)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID → User | 用户 |
| gameId | UUID → Game | 游戏 |
| playtimeMinutes | Int | 总游玩时长(分钟) |
| playtime2Weeks | Int | 近两周时长 |
| lastPlayedAt | DateTime? | 最后游玩时间 |

### UserReview (玩家评测)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID → User | 用户 |
| gameId | UUID → Game | 游戏 |
| content | Text | 评测全文 |
| isRecommended | Boolean | 推荐/不推荐 |
| steamReviewId | String | Steam 评测 ID |

### AIAnalysis (AI 分析缓存)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID → User | 用户 |
| type | Enum | personality / review_style / recommendation |
| content | JsonB | AI 分析结果 |
| generatedAt | DateTime | 生成时间 |

## AI 调用策略

- **锐评**: 首次生成后缓存，用户点"刷新"重新生成
- **评测分析**: 同上，缓存机制
- **推荐**: 每次切换推荐上下文时重新生成 (成本极低)
- **成本控制**: 每用户每次分析约 ¥0.02-0.05
