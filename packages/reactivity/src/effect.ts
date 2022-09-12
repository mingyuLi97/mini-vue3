type EffectFn = () => any;
// 调度器
type EffectScheduler = (effect: ReactiveEffect) => any;
interface EffectOptions {
  scheduler?: EffectScheduler;
}

export let activeEffect: ReactiveEffect = null;

/**
 * @description:
 * @param {EffectFn} fn 根据状态变化重新执行
 */
export function effect(fn: EffectFn, options: EffectOptions = {}) {
  const _effect = new ReactiveEffect(fn, options);
  _effect.run(); // 默认执行一次

  // effect函数的返回值就是一个runner 可以让失活的effect再次执行 只是需要手动触发执行了(不会自动开始收集依赖)
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

class ReactiveEffect {
  active = true;
  // 为了解决 effect 中嵌套 effect 的问题
  parent: ReactiveEffect = null;
  deps: Set<ReactiveEffect>[] = [];
  constructor(public fn: EffectFn, public scheduler?: EffectScheduler) {}

  /**
   * 执行 effect 方法
   */
  run() {
    // 激活状态 才需要收集这个副作用函数fn内用到的响应式数据 也就是我们说的依赖收集
    // 非激活状态 只执行函数 不收集依赖
    if (!this.active) {
      return this.fn();
    }
    let res;

    try {
      this.parent = activeEffect;
      // 激活状态 依赖收集了 核心就是将当前的effect和稍后渲染的属性关联在一起
      activeEffect = this;
      // 执行传入的fn的时候，如果出现了响应式数据的获取操作，就可以获取到这个全局的activeEffect
      cleanupEffect(this);
      res = this.fn();
    } finally {
      // 执行完当前的effect 归还上次 activeEffect 变量指向的值
      activeEffect = this.parent;
      this.parent = null;
    }
    return res;
  }

  stop() {
    if (this.active) {
      this.active = false;
      cleanupEffect(this);
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
  if (effects) {
    /**
     * [...effects] 防止死循环 刚删除的引用马上又添加进来
     *
     * 这样会死循环
     * set.forEach(()=> {
     *  set.delete(1)
     *  set.add(1)
     * })
     *
     */
    [...effects].forEach((effect) => {
      // 在执行 run 的时候 如果访问到属性，就会继续执行 effect（死循环）
      if (effect === activeEffect) return;
      if (effect.scheduler) {
        effect.scheduler(effect);
      } else {
        effect.run();
      }
    });
  }
};

/**
 * 清除effect收集的dep set里 每个属性对当前effect的收集
 * @param effect
 */
const cleanupEffect = (effect: ReactiveEffect) => {
  const { deps } = effect;

  // 不能这样使用，因为是双向记住的
  // deps = []

  for (let i = 0; i < deps.length; i++) {
    // 解除key -> effect的关联 执行effect的时候重新收集
    deps[i].delete(effect);
  }
  // 清空当前effect依赖的dep
  effect.deps.length = 0;
};
