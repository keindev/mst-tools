import {
    _NotCustomized, IModelType as IOriginalModelType, Instance, IOptionalIType, ISimpleType, ModelProperties,
} from 'mobx-state-tree';
import { ConditionalKeys } from 'type-fest';

export type IEffectFlags<PROPS> = {
  [key in ConditionalKeys<PROPS, IOptionalIType<ISimpleType<boolean>, [undefined]>>]: boolean;
};

export type IEffectFunction<INSTANCE, PROPS, EFFECT> = (self: Instance<INSTANCE>, flags: IEffectFlags<PROPS>) => EFFECT;

export interface IEffectFlagsMap {
  [key: string]: boolean;
}

export interface IModelEffects {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [key: string]: readonly [Function, IEffectFlagsMap];
}

export interface IModelType<PROPS extends ModelProperties, OTHERS, CustomC = _NotCustomized, CustomS = _NotCustomized>
  extends IOriginalModelType<PROPS, OTHERS, CustomC, CustomS> {
  effects<E extends IModelEffects>(
    fn: IEffectFunction<this, PROPS, E>
  ): IModelType<PROPS, OTHERS & { [key in keyof E]: E[key][0] }, CustomC, CustomS>;
}
