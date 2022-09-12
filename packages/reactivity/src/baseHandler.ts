import { activeEffect, track, trigger } from "./effect";
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}

export const mutableHandlers = {
  get(target, key, receiver) {
    // 对象没有被代理之前，没有该key，如果代理对象被用来二次代理，会在上面取值，然后get走到这里，返回true了
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    track(target, "get", key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    const oldVal = target[key];
    const result = Reflect.set(target, key, value, receiver);
    if (oldVal !== value) {
      trigger(target, "set", key, value, oldVal);
    }
    return result;
  },
} as ProxyHandler<object>;
