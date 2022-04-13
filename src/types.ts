import {
    _NotCustomized, IModelType as IOriginalModelType, Instance, IOptionalIType, ISimpleType, ModelActions,
    ModelProperties, ModelPropertiesDeclaration, ModelPropertiesDeclarationToProperties,
} from 'mobx-state-tree';
import { ConditionalKeys } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/ban-types
export type IFunction = Function;
// eslint-disable-next-line @typescript-eslint/ban-types
export type IEmptyObject = {};
// eslint-disable-next-line @typescript-eslint/ban-types
export type IObject = Object;

export type IProperties<PROPS extends ModelPropertiesDeclaration = IEmptyObject> =
  ModelPropertiesDeclarationToProperties<PROPS>;

export type IFlags<PROPS extends ModelProperties> = {
  [key in ConditionalKeys<PROPS, IOptionalIType<ISimpleType<boolean>, [undefined]>>]?: boolean;
};

export type IEffectFunction<INSTANCE, PROPS extends ModelProperties, R> = (
  self: Instance<INSTANCE>,
  flags: Required<IFlags<PROPS>>
) => R;
export type ISwitchFunction<R> = () => R;

export interface IModelEffect<PROPS extends ModelProperties> {
  [key: string]: readonly [IFunction, IFlags<PROPS>];
}

export interface IModelSwitch<PROPS extends ModelProperties> {
  [key: string]: IFlags<PROPS>;
}

export interface IModelType<PROPS extends ModelProperties, OTHERS, CustomC = _NotCustomized, CustomS = _NotCustomized>
  extends IOriginalModelType<PROPS, OTHERS, CustomC, CustomS> {
  actions<A extends ModelActions>(fn: (self: Instance<this>) => A): IModelType<PROPS, OTHERS & A, CustomC, CustomS>;
  effects<E extends IModelEffect<PROPS>>(
    fn: IEffectFunction<this, PROPS, E>
  ): IModelType<PROPS, OTHERS & { [key in keyof E]: E[key][0] }, CustomC, CustomS>;
  extend<A extends ModelActions = IEmptyObject, V extends IObject = IEmptyObject, VS extends IObject = IEmptyObject>(
    fn: (self: Instance<this>) => { actions?: A; state?: VS; views?: V }
  ): IModelType<PROPS, OTHERS & A & V & VS, CustomC, CustomS>;
  named(newName: string): IModelType<PROPS, OTHERS, CustomC, CustomS>;
  props<PROPS2 extends ModelPropertiesDeclaration>(
    props: PROPS2
  ): IModelType<PROPS & IProperties<PROPS2>, OTHERS, CustomC, CustomS>;
  switch<E extends IModelSwitch<PROPS>>(
    fn: ISwitchFunction<E>
  ): IModelType<PROPS, OTHERS & { [key in keyof E]: () => void }, CustomC, CustomS>;
  views<V extends IObject>(fn: (self: Instance<this>) => V): IModelType<PROPS, OTHERS & V, CustomC, CustomS>;
  volatile<TP extends object>(fn: (self: Instance<this>) => TP): IModelType<PROPS, OTHERS & TP, CustomC, CustomS>;
}

export interface IEnvironment {
  version?: string;
}
