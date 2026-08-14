# Git 日常开发与仓库管理指南

## 1. Git 在日常开发中的主要用途

Git 主要用于代码版本管理和团队协作，常见操作包括：

- 代码拉取与提交
- 分支创建、切换与删除
- 分支合并
- 临时保存未提交代码
- 处理代码冲突
- 查看仓库状态
- 查看和修改远程仓库地址
- 仓库迁移
- 将已有本地项目推送到新建的远程仓库

在某些描述中可能会看到“代码签入、签出”的说法。

在 Git 语境中可以大致理解为：

| 描述 | Git 中常见对应操作 |
|---|---|
| 签出代码 | `git clone`、`git pull`、`git checkout`、`git switch` |
| 签入代码 | `git add` → `git commit` → `git push` |
| 创建分支 | `git branch`、`git switch -c` |
| 切换分支 | `git checkout`、`git switch` |
| 合并分支 | `git merge` |
| 临时保存代码 | `git stash` |
| 查看状态 | `git status` |
| 解决冲突 | 修改冲突文件 → `git add` → `git commit` |

---

## 2. `git status`：查看当前仓库状态

```bash
git status
```

主要用于查看：

- 当前所在分支
- 哪些文件被修改
- 哪些文件已经暂存
- 哪些文件尚未暂存
- 是否存在冲突文件

遇到 Git 问题时，通常可以先执行：

```bash
git status
```

可以简单理解为：

> 先确认 Git 当前到底处于什么状态。

---

## 3. `git pull`：拉取远程最新代码

```bash
git pull
```

`git pull` 可以简单理解为：

```text
git fetch
+
git merge
```

例如每天开始开发前：

```bash
git switch develop
git pull origin develop
```

表示把远程 `develop` 分支的最新代码同步到本地。

---

## 4. `git add`、`git commit`、`git push`：提交代码

正常开发完成后：

```bash
git add .
git commit -m "feat: 新增用户管理功能"
git push origin feature/user
```

完整流程：

```text
修改代码
   ↓
git add
   ↓
git commit
   ↓
git push
   ↓
GitHub / GitLab
```

需要注意：

- `git add`：把修改加入暂存区
- `git commit`：提交到本地 Git 仓库
- `git push`：把本地提交推送到远程仓库

也就是说：

> `commit` 只是本地提交，`push` 才是把代码发送到远程仓库。

---

## 5. `git branch`：分支管理

### 查看本地分支

```bash
git branch
```

### 创建分支

```bash
git branch feature/user
```

### 删除分支

```bash
git branch -d feature/user
```

### 查看远程分支

```bash
git branch -r
```

### 查看全部分支

```bash
git branch -a
```

现在更推荐直接使用：

```bash
git switch -c feature/user
```

它等价于：

```bash
git branch feature/user
git switch feature/user
```

---

## 6. `git checkout` 与 `git switch`：切换分支

传统方式：

```bash
git checkout develop
```

创建并切换分支：

```bash
git checkout -b feature/user
```

现在 Git 更推荐：

```bash
git switch develop
```

创建并切换：

```bash
git switch -c feature/user
```

原因是：

- `checkout` 功能比较多，既可以切换分支，也可以恢复文件
- `switch` 专门用于分支切换，语义更加清晰

不过实际公司项目和老教程中仍然大量使用 `git checkout`，因此两个都需要掌握。

---

## 7. `git merge`：合并分支

假设当前存在：

```text
develop
   │
   ├────────────
   │ feature/user
   │      ↓
   │   开发完成
   │      ↓
   └──── merge
```

功能开发完成后：

```bash
git switch develop
git pull origin develop
git merge feature/user
```

这里：

```bash
git merge feature/user
```

表示：

> 把 `feature/user` 合并到当前所在的分支。

因此执行 `merge` 之前一定要先确认当前分支：

```bash
git status
```

或者：

```bash
git branch
```

---

## 8. `git stash`：临时保存未提交代码

`git stash` 用于：

> 当前代码改到一半，但暂时不能提交，又需要切换分支处理其他事情。

例如：

```bash
git stash
```

然后切换分支：

```bash
git switch develop
```

处理完其他任务后再回来：

```bash
git switch feature/user
git stash pop
```

### 常用 stash 命令

```bash
# 临时保存当前修改
git stash

# 带描述保存
git stash push -m "开发用户管理功能"

# 查看 stash 列表
git stash list

# 恢复最近一次 stash，并删除该 stash
git stash pop

# 恢复 stash，但不删除
git stash apply

# 删除某一个 stash
git stash drop stash@{0}

# 清空所有 stash
git stash clear
```

### `pop` 和 `apply` 的区别

```text
git stash pop
= 恢复代码 + 删除 stash

git stash apply
= 恢复代码 + 保留 stash
```

### 保存未跟踪文件

默认情况下，新建但还没有执行 `git add` 的文件可能不会被普通 `git stash` 保存。

可以使用：

```bash
git stash -u
```

或者：

```bash
git stash push -u -m "临时保存开发内容"
```

可以把：

- `commit` 理解为正式存档
- `stash` 理解为临时寄存

---

## 9. Git 冲突处理

多人开发时，如果两个人修改了同一部分代码，在 `pull` 或 `merge` 时可能产生冲突。

例如：

```text
<<<<<<< HEAD
const name = '张三';
=======
const name = '李四';
>>>>>>> origin/develop
```

可以理解为：

```text
<<<<<<< HEAD

当前分支的代码

=======

需要合并进来的代码

>>>>>>> xxx
```

### 冲突处理流程

第一步，查看冲突文件：

```bash
git status
```

第二步，根据实际业务逻辑手动修改冲突内容。

第三步，删除 Git 自动添加的冲突标记：

```text
<<<<<<<
=======
>>>>>>>
```

第四步，重新加入暂存区：

```bash
git add .
```

第五步，提交冲突处理结果：

```bash
git commit -m "fix: resolve merge conflict"
```

最后推送：

```bash
git push
```

完整过程：

```text
git pull / git merge
        ↓
     产生冲突
        ↓
    git status
        ↓
找到冲突文件
        ↓
根据业务逻辑修改
        ↓
     git add
        ↓
    git commit
        ↓
     git push
```

解决冲突时不能只机械选择“保留我的”或者“保留对方的”，应该根据实际业务判断：

- 保留当前代码
- 保留对方代码
- 两边同时保留
- 重新组合成正确逻辑

---

# 10. 实际团队开发流程

假设需要开发“用户管理”功能。

## 10.1 更新开发分支

```bash
git switch develop
git pull origin develop
```

## 10.2 创建自己的功能分支

```bash
git switch -c feature/user-management
```

## 10.3 开发完成后提交

```bash
git status
git add .
git commit -m "feat: add user management"
git push origin feature/user-management
```

然后在 GitHub 或 GitLab 创建：

```text
Pull Request / Merge Request
            ↓
        Code Review
            ↓
      合并到 develop
```

---

## 10.4 开发过程中同步最新 develop

如果功能还没有开发完成，但 `develop` 已经被其他同事更新：

```bash
git switch develop
git pull origin develop
```

再切回自己的功能分支：

```bash
git switch feature/user-management
```

把最新 `develop` 合并进来：

```bash
git merge develop
```

如果产生冲突：

```bash
git status
```

处理冲突以后：

```bash
git add .
git commit
git push
```

完整流程：

```text
git pull
   ↓
创建 feature 分支
   ↓
开发
   ↓
git status
   ↓
git add
   ↓
git commit
   ↓
同步最新 develop
   ↓
git merge
   ↓
解决冲突
   ↓
git push
   ↓
提交 PR / MR
```

---

# 11. 仓库之间的切换

“仓库切换”通常存在两种情况。

## 11.1 本地不同 Git 仓库之间切换

本质就是切换项目目录。

例如：

```bash
cd project-a
git status
```

切换到另一个项目：

```bash
cd ../project-b
git status
```

一般情况下，每个包含 `.git` 目录的项目，就是一个独立 Git 仓库。

可以使用：

```bash
git remote -v
```

查看当前本地仓库关联的远程仓库。

---

## 11.2 当前本地仓库切换到另一个远程仓库

首先查看当前远程地址：

```bash
git remote -v
```

例如：

```text
origin  https://github.com/user/old-project.git (fetch)
origin  https://github.com/user/old-project.git (push)
```

修改远程地址：

```bash
git remote set-url origin https://github.com/user/new-project.git
```

再次确认：

```bash
git remote -v
```

然后就可以向新的远程仓库推送：

```bash
git push
```

可以简单记成：

```text
切换本地仓库
→ cd

切换远程仓库
→ git remote set-url
```

---

# 12. Git 仓库迁移

例如：

```text
旧 GitLab 仓库
        ↓
     本地仓库
        ↓
修改 Remote
        ↓
新 GitHub 仓库
```

首先查看旧远程：

```bash
git remote -v
```

假设：

```text
origin https://old-gitlab.com/user/project.git
```

新的仓库地址：

```text
https://github.com/user/project.git
```

修改：

```bash
git remote set-url origin https://github.com/user/project.git
```

确认：

```bash
git remote -v
```

推送主分支：

```bash
git push -u origin main
```

推送全部本地分支：

```bash
git push origin --all
```

推送 Tag：

```bash
git push origin --tags
```

因此常见迁移流程是：

```bash
git remote -v

git remote set-url origin 新仓库地址

git push -u origin main

git push origin --all

git push origin --tags
```

---

## 12.1 更稳妥的迁移方式：暂时保留旧仓库

如果担心直接覆盖原来的远程地址，可以先重命名：

```bash
git remote rename origin old-origin
```

再添加新的远程仓库：

```bash
git remote add origin https://github.com/user/new-project.git
```

查看：

```bash
git remote -v
```

可能会看到：

```text
old-origin  旧仓库地址
origin      新仓库地址
```

这样旧仓库仍然保留。

确认新仓库迁移正常后，可以删除旧远程：

```bash
git remote remove old-origin
```

这种方式在公司项目仓库迁移时更加稳妥。

---

# 13. 远程仓库是新建的，将已有本地项目推送到远程

假设本地已经有一个项目：

```text
my-vue-project
```

GitHub 或 GitLab 上刚创建了一个新的空仓库。

进入项目：

```bash
cd my-vue-project
```

如果本地还不是 Git 仓库：

```bash
git init
```

查看状态：

```bash
git status
```

添加项目文件：

```bash
git add .
```

创建第一次提交：

```bash
git commit -m "init project"
```

把默认分支修改为 `main`：

```bash
git branch -M main
```

关联远程仓库：

```bash
git remote add origin https://github.com/user/my-vue-project.git
```

查看远程地址：

```bash
git remote -v
```

第一次推送：

```bash
git push -u origin main
```

完整流程：

```bash
git init

git add .

git commit -m "init project"

git branch -M main

git remote add origin https://github.com/user/my-vue-project.git

git push -u origin main
```

---

## 13.1 `git push -u` 的作用

第一次执行：

```bash
git push -u origin main
```

其中：

```text
-u
```

表示建立本地分支与远程分支之间的跟踪关系：

```text
本地 main
    ↓
远程 origin/main
```

建立以后，后面通常可以直接：

```bash
git push
```

以及：

```bash
git pull
```

---

# 14. 新建远程仓库时的常见坑

如果在 GitHub / GitLab 创建远程仓库时，同时初始化了：

- README
- `.gitignore`
- LICENSE

那么远程仓库已经存在自己的 Commit。

而本地项目也已经有自己的 Commit，此时直接：

```bash
git push -u origin main
```

可能会失败。

原因可以理解为：

```text
本地提交历史 A

远程提交历史 B

两边不存在共同起点
```

---

## 14.1 需要保留远程仓库内容

可以先：

```bash
git pull origin main --allow-unrelated-histories
```

如果产生冲突，手动处理。

然后：

```bash
git add .
git commit
git push -u origin main
```

---

## 14.2 远程只是刚创建，没有内容需要保留

最简单的做法通常是在创建远程仓库时：

> 不初始化 README、LICENSE 和 `.gitignore`。

直接创建一个真正的空仓库。

然后本地：

```bash
git push -u origin main
```

即可。

---

# 15. Git 高频命令速查

## 查看状态

```bash
git status
```

## 查看分支

```bash
git branch
```

## 创建并切换分支

```bash
git switch -c feature/user
```

或者：

```bash
git checkout -b feature/user
```

## 切换分支

```bash
git switch develop
```

或者：

```bash
git checkout develop
```

## 拉取代码

```bash
git pull
```

## 添加暂存区

```bash
git add .
```

## 提交

```bash
git commit -m "feat: xxx"
```

## 推送

```bash
git push
```

## 合并

```bash
git merge feature/user
```

## 临时保存

```bash
git stash
```

## 恢复临时代码

```bash
git stash pop
```

## 查看 stash

```bash
git stash list
```

## 查看远程仓库

```bash
git remote -v
```

## 修改远程仓库

```bash
git remote set-url origin 新仓库地址
```

## 添加远程仓库

```bash
git remote add origin 新仓库地址
```

## 推送全部分支

```bash
git push origin --all
```

## 推送 Tag

```bash
git push origin --tags
```

---

# 16. 一套完整的 Git 日常开发记忆路线

```text
1. 查看状态
git status

2. 拉取代码
git pull

3. 提交代码
git add
git commit
git push

4. 分支管理
git branch
git checkout / git switch

5. 合并代码
git merge

6. 临时保存
git stash

7. 冲突处理
git status
→ 修改冲突
→ git add
→ git commit

8. 查看远程仓库
git remote -v

9. 切换远程仓库
git remote set-url origin xxx

10. 仓库迁移
旧仓库
→ 本地
→ 修改 remote
→ push

11. 本地已有项目上传新仓库
git init
→ git add
→ git commit
→ git remote add
→ git push
```
---
# 17. 核心理解

Git 日常开发最重要的不是单独记命令，而是理解完整协作流程：

```text
远程仓库
   ↓
git pull
   ↓
创建功能分支
   ↓
开发代码
   ↓
git add
   ↓
git commit
   ↓
同步最新代码
   ↓
git merge
   ↓
解决冲突
   ↓
git push
   ↓
PR / MR
   ↓
代码 Review
   ↓
合并到开发分支
```

当这套流程能够熟练掌握以后，基本可以满足绝大多数前端开发岗位日常 Git 使用需求。
