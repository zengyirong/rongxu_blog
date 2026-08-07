---
title: Vue3 响应式原理
description: 梳理 reactive、track、trigger 与依赖收集的基本链路。
date: 2026-08-07
category: frontend
tags:
  - Vue
  - 响应式
outline: deep
---

## 背景

Vue 3 的响应式系统是理解组合式 API 与组件更新的基础。本文用最短路径串起 `reactive` → 依赖收集 → 触发更新。

## 结论先行

1. 读取响应式对象属性时会 **track**（收集依赖）
2. 写入属性时会 **trigger**（通知依赖重新执行）
3. `effect` / 组件渲染函数是被收集的「副作用」

## reactive

`reactive` 用 Proxy 包装普通对象，拦截 get / set：

```ts
import { reactive } from 'vue'

const state = reactive({ count: 0 })

// get → track
console.log(state.count)

// set → trigger
state.count++
```

## track

在 effect 执行期间访问响应式属性，会把当前 effect 记入该属性的依赖集合。

```ts
// 伪代码示意
function track(target, key) {
  if (!activeEffect) return
  // depsMap.get(key).add(activeEffect)
}
```

## trigger

属性变更时，取出依赖集合并逐个重新运行 effect，从而驱动视图更新。

```ts
// 伪代码示意
function trigger(target, key) {
  // const deps = depsMap.get(key)
  // deps.forEach(effect => effect.run())
}
```

## 小结

- 读触发收集，写触发更新
- 组件 `setup` 中的渲染本质也是一种 effect
- 调试更新问题时，先确认：是不是访问了未包装的普通对象、或解构破坏了响应式

## 参考

- [Vue 官方文档 · 响应式基础](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)
