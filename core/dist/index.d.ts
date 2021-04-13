import { DeepReadonly, ComputedRef, App, Plugin } from 'vue';

declare type ReadState<TState> = DeepReadonly<TState>;
declare type WriteState<TState> = TState;
declare type Getter<TState, TResult> = (state: ReadState<TState>) => TResult;
declare type Mutator<TState, TPayload, TResult = void> = (state: WriteState<TState>, payload: TPayload) => TResult;
declare type Mutation<TPayload, TResult = void> = undefined extends TPayload ? (payload?: TPayload) => TResult : (payload: TPayload) => TResult;
declare type InternalStores = Map<string, InternalStore<any>>;
declare type EventHandler<TData = any> = (payload?: EventPayload<TData>) => void;
interface Emittable {
    on(event: string, handler: EventHandler): EventListener;
    once(event: string, handler: EventHandler): EventListener;
    off(event: string, handler: EventHandler): void;
    emit(event: string, payload?: EventPayload): void;
}
interface EventListener {
    dispose(): void;
}
interface EventPayload<TData = any> {
    sender: string;
    store: string;
    data: TData;
}
interface MutationEventData<TPayload = any, TResult = any> {
    mutation: string;
    payload: TPayload;
    result?: TResult;
}
interface StoreBase<TState> {
    getter<TResult>(name: string, getter: Getter<TState, TResult>): ComputedRef<TResult>;
    mutation<TPayload, TResult = void>(name: string, mutator: Mutator<TState, TPayload, TResult>): Mutation<TPayload, TResult>;
}
interface InternalStore<TState = any> extends StoreBase<TState> {
    readonly state: ReadState<TState>;
    name: string;
    getters: Map<string, Function>;
    mutations: Map<string, Mutator<TState, any, any>>;
    emit(event: string, sender: string, data: any): void;
    exec<TResult = void>(name: string, payload?: any): TResult;
    write<TResult = void>(name: string, sender: string, mutator: Mutator<TState, undefined, TResult>): TResult;
}
interface Store<TState> extends StoreBase<TState> {
    state: ReadState<TState>;
    on(event: string, handler: EventHandler): EventListener;
    once(event: string, handler: EventHandler): EventListener;
    destroy(): void;
    onBeforeMutation<TPayload = any, TResult = any>(callback: EventHandler<MutationEventData<TPayload, TResult>>): EventListener;
    onAfterMutation<TPayload = any, TResult = any>(callback: EventHandler<MutationEventData<TPayload, TResult>>): EventListener;
    onMutationError<TPayload = any, TResult = any>(callback: EventHandler<MutationEventData<TPayload, TResult>>): EventListener;
}
interface HarlemPlugin {
    name: string;
    install(app: App, eventEmitter: Emittable, stores: InternalStores): void;
}
interface Options {
    plugins?: HarlemPlugin[];
}

declare const EVENTS: {
    core: {
        installed: string;
    };
    store: {
        created: string;
        destroyed: string;
    };
    mutation: {
        before: string;
        after: string;
        error: string;
    };
};

declare const on: (event: string, handler: EventHandler<any>) => EventListener;
declare const once: (event: string, handler: EventHandler<any>) => EventListener;
declare function createStore<T extends object = any>(name: string, data: T, { allowOverwrite }?: {
    allowOverwrite?: boolean;
}): Store<T>;
declare const _default: Plugin;

export default _default;
export { EVENTS, Emittable, EventHandler, EventListener, EventPayload, Getter, HarlemPlugin, InternalStore, InternalStores, Mutation, MutationEventData, Mutator, Options, ReadState, Store, StoreBase, WriteState, createStore, on, once };
