import {
    _NotCustomized, IAnyModelType, IModelType as IOriginalModelType, Instance, IOptionalIType, ISimpleType,
    ModelActions, ModelProperties, ModelPropertiesDeclaration, ModelPropertiesDeclarationToProperties,
} from 'mobx-state-tree';
import { ConditionalKeys } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/ban-types
export type IFunction = Function;
// eslint-disable-next-line @typescript-eslint/ban-types
export type IEmptyObject = {};
// eslint-disable-next-line @typescript-eslint/ban-types
export type IObject = Object;

export type IProperties<P extends ModelPropertiesDeclaration = IEmptyObject> =
  ModelPropertiesDeclarationToProperties<P>;

export type IEffectFlags<PROPS> = {
  [key in ConditionalKeys<PROPS, IOptionalIType<ISimpleType<boolean>, [undefined]>>]: boolean;
};

export type IEffectFunction<INSTANCE, PROPS, EFFECT> = (self: Instance<INSTANCE>, flags: IEffectFlags<PROPS>) => EFFECT;

export interface IEffectFlagsMap {
  [key: string]: boolean;
}

export interface IModelEffects {
  [key: string]: readonly [IFunction, IEffectFlagsMap];
}

export interface IModelType<PROPS extends ModelProperties, OTHERS, CustomC = _NotCustomized, CustomS = _NotCustomized>
  extends IOriginalModelType<PROPS, OTHERS, CustomC, CustomS> {
  actions<A extends ModelActions>(fn: (self: Instance<this>) => A): IModelType<PROPS, OTHERS & A, CustomC, CustomS>;
  effects<E extends IModelEffects>(
    fn: IEffectFunction<this, PROPS, E>
  ): IModelType<PROPS, OTHERS & { [key in keyof E]: E[key][0] }, CustomC, CustomS>;
  extend<A extends ModelActions = IEmptyObject, V extends IObject = IEmptyObject, VS extends IObject = IEmptyObject>(
    fn: (self: Instance<this>) => { actions?: A; state?: VS; views?: V }
  ): IModelType<PROPS, OTHERS & A & V & VS, CustomC, CustomS>;
  named(newName: string): IModelType<PROPS, OTHERS, CustomC, CustomS>;
  props<PROPS2 extends ModelPropertiesDeclaration>(
    props: PROPS2
  ): IModelType<PROPS & IProperties<PROPS2>, OTHERS, CustomC, CustomS>;
  props<PROPS2 extends ModelPropertiesDeclaration>(
    props: PROPS2
  ): IModelType<PROPS & IProperties<PROPS2>, OTHERS, CustomC, CustomS>;
  views<V extends IObject>(fn: (self: Instance<this>) => V): IModelType<PROPS, OTHERS & V, CustomC, CustomS>;
  volatile<TP extends object>(fn: (self: Instance<this>) => TP): IModelType<PROPS, OTHERS & TP, CustomC, CustomS>;
}

export type IModelTypeInstance<T> = {
  cloneAndEnhance(opts: { initializers?: ReadonlyArray<(instance: Instance<T>) => Instance<T>> }): IAnyModelType;
  instantiateActions(self: Instance<T>, actions: ModelActions): void;
};
