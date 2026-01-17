#!/usr/bin/env node

/**
 * 统一版本号脚本
 * 用法: node scripts/version.mjs <version>
 * 示例: node scripts/version.mjs 1.0.1
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { consola } from "consola";
import { simpleGit } from "simple-git";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const newVersion = process.argv[2];

if (!newVersion) {
  consola.info("用法: pnpm version:set <version>");
  consola.info("示例: pnpm version:set 1.0.1");
  process.exit(1);
}

const packages = [
  "package.json",
  "packages/honeycomb-client/package.json",
  "packages/honeycomb-common/package.json",
  "packages/honeycomb-db/package.json",
  "packages/honeycomb-server/package.json",
];

// 更新版本号
let count = 0;
for (const pkgPath of packages) {
  const fullPath = join(rootDir, pkgPath);
  const pkg = JSON.parse(readFileSync(fullPath, "utf-8"));
  pkg.version = newVersion;
  writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  consola.success(`${pkg.name}: ${newVersion}`);
  count++;
}

consola.success(`已更新 ${count} 个包的版本号为 ${newVersion}`);

// Git 操作
const git = simpleGit(rootDir);
const tagName = `v${newVersion}`;
const commitMessage = `chore: release ${tagName}`;

try {
  // 添加所有变更的文件
  await git.add(packages);

  // 提交
  await git.commit(commitMessage);
  consola.success(`Git 提交成功: ${commitMessage}`);

  // 打 tag
  await git.addTag(tagName);
  consola.success(`Git tag 创建成功: ${tagName}`);

  // 推送提交到远程
  await git.push();
  consola.success("Git 提交已推送到远程");

  // 推送 tag 到远程
  await git.pushTags("origin");
  consola.success(`Git tag ${tagName} 已推送到远程`);

  consola.success("版本更新完成！");
} catch (error) {
  consola.error(`Git 操作失败: ${error.message}`);
  consola.info("提示: 请手动执行以下命令:");
  consola.info("  git add .");
  consola.info(`  git commit -m "${commitMessage}"`);
  consola.info(`  git tag ${tagName}`);
  consola.info("  git push");
  consola.info(`  git push origin ${tagName}`);
  process.exit(1);
}
