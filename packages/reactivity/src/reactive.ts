import { isObject } from "@vue/shared";
import { mutableHandlers, ReactiveFlags } from "./baseHandler";

// 缓存已经代理过后的响应式对象
const reactiveMap = new WeakMap();
/**
 * 1. 将对象转换成响应式（只能代理对象）
 */
export function reactive(target) {
  if (!isObject(target)) {
    return;
  }

  // 处理传入已经响应式过的
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }

  const existingProxy = reactiveMap.get(target);
  // 目标对象被代理过 返回同一个代理
  if (existingProxy) return existingProxy;

  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
