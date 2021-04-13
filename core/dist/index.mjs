var __defProp = Object.defineProperty;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {enumerable: true, configurable: true, writable: true, value}) : obj[key] = value;
var __assign = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/event-emitter.ts
var EventEmitter = class {
  constructor() {
    this.listeners = {};
  }
  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return {
      dispose: () => this.off(event, handler)
    };
  }
  off(event, handler) {
    const listeners = this.listeners[event];
    if (!listeners) {
      return;
    }
    this.listeners[event] = listeners.filter((listener) => listener !== handler);
    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }
  once(event, handler) {
    const callback = (payload) => {
      handler(payload);
      this.off(event, callback);
    };
    return this.on(event, callback);
  }
  emit(event, payload) {
    const handlers = this.listeners[event];
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => handler(payload));
  }
};
var event_emitter_default = new EventEmitter();

// src/constants.ts
var SENDER = "core";
var OPTIONS = {
  plugins: []
};
var EVENTS = {
  core: {
    installed: "core:installed"
  },
  store: {
    created: "store:created",
    destroyed: "store:destroyed"
  },
  mutation: {
    before: "mutation:before",
    after: "mutation:after",
    error: "mutation:error"
  }
};

// src/store.ts
import {
  reactive,
  readonly,
  computed
} from "vue";

// src/utilities.ts
function lockObject(input, exclusions) {
  return new Proxy(input, {
    get(target, prop) {
      if (exclusions.includes(prop)) {
        throw new Error(`Access to property '${prop}' is denied`);
      }
      const value = target[prop];
      if (typeof value === "function") {
        return (...args) => Reflect.apply(value, target, args);
      }
      return value;
    }
  });
}
function raiseDuplicationError(type, name) {
}

// src/store.ts
function localiseHandler(name, handler) {
  return (payload) => {
    if (payload && payload.store === name) {
      handler(payload);
    }
  };
}
var Store = class {
  constructor(name, state) {
    this.writeState = reactive(state);
    this.readState = readonly(this.writeState);
    this.name = name;
    this.getters = new Map();
    this.mutations = new Map();
  }
  get state() {
    return this.readState;
  }
  emit(event, sender, data) {
    const payload = {
      data,
      sender,
      store: this.name
    };
    event_emitter_default.emit(event, payload);
  }
  on(event, handler) {
    return event_emitter_default.on(event, localiseHandler(this.name, handler));
  }
  once(event, handler) {
    return event_emitter_default.once(event, localiseHandler(this.name, handler));
  }
  getter(name, getter) {
    if (this.getters.has(name)) {
      raiseDuplicationError("getter", name);
    }
    const output = computed(() => getter(this.state));
    this.getters.set(name, () => output.value);
    return output;
  }
  mutate(name, sender, mutator, payload) {
    const eventData = {
      payload,
      mutation: name
    };
    let result;
    this.emit(EVENTS.mutation.before, sender, eventData);
    try {
      result = mutator(this.writeState, payload);
    } catch (error) {
      this.emit(EVENTS.mutation.error, sender, eventData);
      throw error;
    }
    this.emit(EVENTS.mutation.after, sender, __assign(__assign({}, eventData), {
      result
    }));
    return result;
  }
  mutation(name, mutator) {
    if (this.mutations.has(name)) {
      raiseDuplicationError("mutation", name);
    }
    const mutation = (payload) => {
      return this.mutate(name, SENDER, mutator, payload);
    };
    this.mutations.set(name, mutation);
    return mutation;
  }
  exec(name, payload) {
    const mutation = this.mutations.get(name);
    if (!mutation) {
      throw new Error(`No mutation found for ${name}`);
    }
    return mutation(payload);
  }
  write(name, sender, mutator) {
    return this.mutate(name, sender, mutator, void 0);
  }
};
var store_default = Store;

// src/index.ts
var stores = new Map();
var installed = false;
function emitCreated(store, state) {
  const created = () => store.emit(EVENTS.store.created, SENDER, state);
  if (installed) {
    return created();
  }
  event_emitter_default.once(EVENTS.core.installed, created);
}
function installPlugin(plugin, app) {
  if (!plugin || typeof plugin.install !== "function") {
    return;
  }
  const {
    name,
    install
  } = plugin;
  const lockedStores = lockObject(stores, [
    "set",
    "delete",
    "clear"
  ]);
  try {
    install(app, event_emitter_default, lockedStores);
  } catch (error) {
    console.warn(`Failed to install Harlem plugin: ${name}. Skipping.`);
  }
}
var on = event_emitter_default.on.bind(event_emitter_default);
var once = event_emitter_default.once.bind(event_emitter_default);
function createStore(name, data, {allowOverwrite = false} = {}) {
  if (stores.has(name) && !allowOverwrite) {
    raiseDuplicationError("store", name);
  }
  const store = new store_default(name, data);
  const destroy = () => {
    store.emit(EVENTS.store.destroyed, SENDER, data);
    stores.delete(name);
  };
  const getMutationHook = (eventName) => {
    return (callback) => store.on(eventName, callback);
  };
  const onBeforeMutation = getMutationHook(EVENTS.mutation.before);
  const onAfterMutation = getMutationHook(EVENTS.mutation.after);
  const onMutationError = getMutationHook(EVENTS.mutation.error);
  stores.set(name, store);
  emitCreated(store, data);
  return {
    destroy,
    onBeforeMutation,
    onAfterMutation,
    onMutationError,
    state: store.state,
    getter: store.getter.bind(store),
    mutation: store.mutation.bind(store),
    on: store.on.bind(store),
    once: store.once.bind(store)
  };
}
var src_default = {
  install(app, options = OPTIONS) {
    const {
      plugins
    } = __assign(__assign({}, OPTIONS), options);
    if (plugins) {
      plugins.forEach((plugin) => installPlugin(plugin, app));
    }
    installed = true;
    event_emitter_default.emit(EVENTS.core.installed);
  }
};
export {
  EVENTS,
  createStore,
  src_default as default,
  on,
  once
};
//# sourceMappingURL=index.mjs.map
