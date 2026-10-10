# 手动上传到 GitHub（GitHub Pages 版）

目标仓库：`https://github.com/lydiaforever/bie-hua-le`

## 重要：不要再上传外层文件夹

仓库根目录必须直接看到 `app`、`docs`、`public` 和 `package.json`，不能只看到一个 `bie-hua-le` 文件夹。

## 重新上传

1. 在 GitHub 仓库中删除当前错误上传的 `bie-hua-le` 文件夹，或者直接重新创建空仓库。
2. 上传本文件夹**里面的全部文件和文件夹**，不要上传本文件夹本身。
3. 上传完成后，仓库首页必须直接看到 `docs` 文件夹。
4. 打开仓库的 **Settings → Pages**。
5. 在 **Build and deployment** 中选择 **Deploy from a branch**。
6. Branch 选择 `main`，文件夹选择 `/docs`，点击 **Save**。
7. 等待约 1–3 分钟，打开：`https://lydiaforever.github.io/bie-hua-le/`

## 使用命令行上传

在当前文件夹中依次执行：

```bash
git init
git add .
git commit -m "Initial mobile savings game prototype"
git branch -M main
git remote add origin https://github.com/lydiaforever/bie-hua-le.git
git push -u origin main
```

GitHub 不负责保证中国大陆用户稳定访问网页。代码上传后，建议再部署到腾讯云 CloudBase、阿里云 OSS 或其他国内托管服务。
