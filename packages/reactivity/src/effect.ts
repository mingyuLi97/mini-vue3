type EffectFn = () => any;

export let activeEffect: ReactiveEffect = null;

/**
 * @description:
 * @param {EffectFn} fn 根据状态变化重新执行
 */
export function effect(fn: EffectFn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run(); // 默认执行一次
}

class ReactiveEffect {
  active = true;
  // 为了解决 effect 中嵌套 effect 的问题
  parent: ReactiveEffect = null;
  deps: Set<ReactiveEffect>[] = [];
  constructor(public fn: EffectFn) {}

  /**
   * 执行 effect 方法
   */
  run() {
    // 激活状态 才需要收集这个副作用函数fn内用到的响应式数据 也就是我们说的依赖收集
    // 非激活状态 只执行函数 不收集依赖
    if (!this.active) {
      this.fn();
    }

    try {
      this.parent = activeEffect;
      // 激活状态 依赖收集了 核心就是将当前的effect和稍后渲染的属性关联在一起
      activeEffect = this;
      // 执行传入的fn的时候，如果出现了响应式数据的获取操作，就可以获取到这个全局的activeEffect
      return this.fn();
    } finally {
      // 执行完当前的effect 归还上次 activeEffect 变量指向的值
      activeEffect = this.parent;
      this.parent = null;
    }
  }
}

/**
 * 对象的属性对应多个 effect
 *
 * targetMap = {对象: Map{name: Set}}
 */
const targetMap = new WeakMap<object, Map<keyof any, Set<ReactiveEffect>>>();
type Operator = "get" | "set";

/**
 * 依赖收集
 * @param {object} target
 * @param {Operator} type
 * @param {keyof} key
 * @return {*}
 */
export const track = (target: object, type: Operator, key: keyof any) => {
  // 不是在effect使用，不需要收集依赖
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  let shouldTrack = !dep.has(activeEffect);
  if (shouldTrack) {
    dep.add(activeEffect); // 属性记录 effect
    activeEffect.deps.push(dep); // 让 effect 记录对应的 dep, 清理的时候用
  }
};

/**
 * 触发更新
 */
export const trigger = (
  target: object,
  type: Operator,
  key: keyof any,
  value?: unknown,
  oldValue?: unknown
) => {
  const depsMap = targetMap.get(target);
  if (!depsMap) return; // 触发的值在模版中没用过

  // 拿到属性对应的set effects
  const effects = depsMap.get(key);
  // 防止死循环 刚删除的引用马上又添加进来
  if (effects) {
    effects.forEach((effect) => {
      // 在执行 run 的时候 如果访问到属性，就会继续执行 effect（死循环）
      if (effect === activeEffect) return;
      effect.run();
    });
  }
};
