# mini-vue3

vue3 源码分析，参考自

## 响应式

1. 首先使用 reactive 方法创建一个响应式数据 (`new Proxy`)
2. effect 默认会执行一次 `run()` 方法，在方法执行过程中访问了内部的响应式数据，执行依赖收集
3. 当用户修改响应式数据时，将收集到的 effect 依次执行

## diff

## 参考

1. [b 站：珠峰 从零搭建自己的 Vue3](https://www.bilibili.com/video/BV1Q3411w7SQ)
2. [github： zf 笔记](https://github.com/maolovecoding/mini-vue3)
3. [github：write-vue](https://github.com/naihe138/write-vue)
4. [github：zf 笔记](https://github.com/xiuxiuyifan/vue3-zf)
