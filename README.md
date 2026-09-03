# FitCheck

FitCheck 是一个 AI 虚拟试衣、数字衣橱和穿搭日历项目。

## 当前阶段

阶段 2B：已接入邮箱密码注册登录、HttpOnly 会话、Prisma 数据库、用户隔离的衣橱和日历。当前本地使用 SQLite，尚未接入 OSS 和百炼 API。

## 本地运行

```bash
npm install
npm run dev
```

默认访问 `http://localhost:3000/try`。如需指定端口：

```bash
npm run dev -- --port 5174
```

## 验证

```bash
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
```

## 路由

- `/try`：试衣和结果页
- `/wardrobe`：衣橱和穿搭详情
- `/calendar`：穿搭日历

## 目录

- `app/`：Next.js 路由与根布局
- `components/`：页面组件与弹窗
- `lib/`：共享类型和静态演示数据
- `public/`：本地参考图片
- `prisma/`：数据模型与迁移
- `src/`：阶段 1 全局样式与旧原型源文件

## 阶段 2B 数据规则

- 游客可以完成试衣和下载。
- 衣橱、日历以及保存操作需要登录。
- 服务端从 HttpOnly 会话取得用户身份，不接受前端指定用户 ID。
- 本地上传的图片只有最终图；AI 作品可保留原始人物、服装和背景图。
- 添加到日历时会先确保作品已进入衣橱。
- 当前图片以开发用数据形式保存在 SQLite；阶段 3 将替换为私有 OSS Object Key。
