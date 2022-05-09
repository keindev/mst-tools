import {
    _CustomJoin, getPropertyMembers, Instance, ModelActions, ModelProperties, ModelPropertiesDeclaration,
    types as _types,
} from '../mst/index';
import {
    IEffectFunction, IEmptyObject, IModelEffect, IModelSwitch, IModelType, IObject, IProperties, ISwitchFunction,
} from '../types';
import { getEffectAction } from './utils/getEffectAction';
import { getFlags } from './utils/getFlags';
import { getSwitchAction } from './utils/getSwitchAction';

type Declaration = ModelPropertiesDeclaration;
type Raw<P extends Declaration, O> = Omit<IModelType<IProperties<P>, O>, 'effects'>;
type Extended<P extends Declaration, O> = IModelType<IProperties<P>, O>;

const define = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): Extended<P, O> => {
  defineActions(store);
  defineEffects(store);
  defineExtend(store);
  defineNamed(store);
  defineProps(store);
  defineViews(store);
  defineVolatile(store);
  defineSwitch(store);

  return store as Extended<P, O>;
};

const defineActions = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  const { actions } = store;

  Object.defineProperty(store, 'actions', {
    configurable: true,
    writable: true,
    value<A extends ModelActions>(fn: (self: Instance<typeof store>) => A): Extended<P, O & A> {
      return define(actions.bind(store)(fn) as Extended<P, O & A>);
    },
  });
};

const defineEffects = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  Object.defineProperty(store, 'effects', {
    configurable: true,
    writable: true,
    value<E extends IModelEffect<IProperties<P>>>(fn: IEffectFunction<typeof store, IProperties<P>, E>) {
      const flags = getFlags(getPropertyMembers(store).properties as P);

      return store.actions(self =>
        Object.fromEntries(Object.entries(fn(self, flags)).map(effect => getEffectAction(self, effect)))
      );
    },
  });
};

const defineSwitch = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  Object.defineProperty(store, 'switch', {
    configurable: true,
    writable: true,
    value<E extends IModelSwitch<IProperties<P>>>(fn: ISwitchFunction<E>) {
      return store.actions(self =>
        Object.fromEntries(Object.entries(fn()).map(switcher => getSwitchAction(self, switcher)))
      );
    },
  });
};

const defineExtend = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  const { extend } = store;

  Object.defineProperty(store, 'extend', {
    configurable: true,
    writable: true,
    value<A extends ModelActions = IEmptyObject, V extends IObject = IEmptyObject, VS extends IObject = IEmptyObject>(
      fn: (self: Instance<typeof store>) => { actions?: A; state?: VS; views?: V }
    ): Extended<P, O & A> {
      return define(extend.bind(store)(fn) as Extended<P, O & A & V & VS>);
    },
  });
};

const defineNamed = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  const { named } = store;

  Object.defineProperty(store, 'named', {
    configurable: true,
    writable: true,
    value(newName: string): Extended<P, O> {
      return define(named.bind(store)(newName) as Extended<P, O>);
    },
  });
};

const defineProps = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  const { props } = store;

  Object.defineProperty(store, 'props', {
    configurable: true,
    writable: true,
    value<D extends Declaration>(properties: D): Extended<P & D, O> {
      return define(props.bind(store)(properties) as Extended<P & D, O>);
    },
  });
};

const defineViews = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  const { views } = store;

  Object.defineProperty(store, 'views', {
    configurable: true,
    writable: true,
    value<V extends IObject>(fn: (self: Instance<typeof store>) => V): Extended<P, O & V> {
      return define(views.bind(store)(fn) as Extended<P, O & V>);
    },
  });
};

const defineVolatile = <P extends Declaration, O = IEmptyObject>(store: Raw<P, O>): void => {
  const { volatile } = store;

  Object.defineProperty(store, 'volatile', {
    configurable: true,
    writable: true,
    value<V extends IEmptyObject>(fn: (self: Instance<typeof store>) => V): Extended<P, O & V> {
      return define(volatile.bind(store)(fn) as Extended<P, O & V>);
    },
  });
};

/* eslint-disable max-len */
// copied from https://github.com/mobxjs/mobx-state-tree/blob/master/packages/mobx-state-tree/src/types/complex-types/model.ts
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>): IModelType<PA & PB, OA & OB, _CustomJoin<FCA, FCB>, _CustomJoin<FSA, FSB>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>): IModelType<PA & PB, OA & OB, _CustomJoin<FCA, FCB>, _CustomJoin<FSA, FSB>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>): IModelType<PA & PB & PC, OA & OB & OC, _CustomJoin<FCA, _CustomJoin<FCB, FCC>>, _CustomJoin<FSA, _CustomJoin<FSB, FSC>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>): IModelType<PA & PB & PC, OA & OB & OC, _CustomJoin<FCA, _CustomJoin<FCB, FCC>>, _CustomJoin<FSA, _CustomJoin<FSB, FSC>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>): IModelType<PA & PB & PC & PD, OA & OB & OC & OD, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, FCD>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, FSD>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>): IModelType<PA & PB & PC & PD, OA & OB & OC & OD, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, FCD>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, FSD>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>): IModelType<PA & PB & PC & PD & PE, OA & OB & OC & OD & OE, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, FCE>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, FSE>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>): IModelType<PA & PB & PC & PD & PE, OA & OB & OC & OD & OE, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, FCE>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, FSE>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>): IModelType<PA & PB & PC & PD & PE & PF, OA & OB & OC & OD & OE & OF, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, FCF>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, FSF>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>): IModelType<PA & PB & PC & PD & PE & PF, OA & OB & OC & OD & OE & OF, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, FCF>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, FSF>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF, PG extends ModelProperties, OG, FCG, FSG>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>, G: IModelType<PG, OG, FCG, FSG>): IModelType<PA & PB & PC & PD & PE & PF & PG, OA & OB & OC & OD & OE & OF & OG, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, _CustomJoin<FCF, FCG>>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, _CustomJoin<FSF, FSG>>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF, PG extends ModelProperties, OG, FCG, FSG>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>, G: IModelType<PG, OG, FCG, FSG>): IModelType<PA & PB & PC & PD & PE & PF & PG, OA & OB & OC & OD & OE & OF & OG, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, _CustomJoin<FCF, FCG>>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, _CustomJoin<FSF, FSG>>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF, PG extends ModelProperties, OG, FCG, FSG, PH extends ModelProperties, OH, FCH, FSH>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>, G: IModelType<PG, OG, FCG, FSG>, H: IModelType<PH, OH, FCH, FSH>): IModelType<PA & PB & PC & PD & PE & PF & PG & PH, OA & OB & OC & OD & OE & OF & OG & OH, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, _CustomJoin<FCF, _CustomJoin<FCG, FCH>>>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, _CustomJoin<FSF, _CustomJoin<FSG, FSH>>>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF, PG extends ModelProperties, OG, FCG, FSG, PH extends ModelProperties, OH, FCH, FSH>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>, G: IModelType<PG, OG, FCG, FSG>, H: IModelType<PH, OH, FCH, FSH>): IModelType<PA & PB & PC & PD & PE & PF & PG & PH, OA & OB & OC & OD & OE & OF & OG & OH, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, _CustomJoin<FCF, _CustomJoin<FCG, FCH>>>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, _CustomJoin<FSF, _CustomJoin<FSG, FSH>>>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF, PG extends ModelProperties, OG, FCG, FSG, PH extends ModelProperties, OH, FCH, FSH, PI extends ModelProperties, OI, FCI, FSI>(name: string, A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>, G: IModelType<PG, OG, FCG, FSG>, H: IModelType<PH, OH, FCH, FSH>, I: IModelType<PI, OI, FCI, FSI>): IModelType<PA & PB & PC & PD & PE & PF & PG & PH & PI, OA & OB & OC & OD & OE & OF & OG & OH & OI, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, _CustomJoin<FCF, _CustomJoin<FCG, _CustomJoin<FCH, FCI>>>>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, _CustomJoin<FSF, _CustomJoin<FSG, _CustomJoin<FSH, FSI>>>>>>>>>;
// prettier-ignore
export function compose<PA extends ModelProperties, OA, FCA, FSA, PB extends ModelProperties, OB, FCB, FSB, PC extends ModelProperties, OC, FCC, FSC, PD extends ModelProperties, OD, FCD, FSD, PE extends ModelProperties, OE, FCE, FSE, PF extends ModelProperties, OF, FCF, FSF, PG extends ModelProperties, OG, FCG, FSG, PH extends ModelProperties, OH, FCH, FSH, PI extends ModelProperties, OI, FCI, FSI>(A: IModelType<PA, OA, FCA, FSA>, B: IModelType<PB, OB, FCB, FSB>, C: IModelType<PC, OC, FCC, FSC>, D: IModelType<PD, OD, FCD, FSD>, E: IModelType<PE, OE, FCE, FSE>, F: IModelType<PF, OF, FCF, FSF>, G: IModelType<PG, OG, FCG, FSG>, H: IModelType<PH, OH, FCH, FSH>, I: IModelType<PI, OI, FCI, FSI>): IModelType<PA & PB & PC & PD & PE & PF & PG & PH & PI, OA & OB & OC & OD & OE & OF & OG & OH & OI, _CustomJoin<FCA, _CustomJoin<FCB, _CustomJoin<FCC, _CustomJoin<FCD, _CustomJoin<FCE, _CustomJoin<FCF, _CustomJoin<FCG, _CustomJoin<FCH, FCI>>>>>>>>, _CustomJoin<FSA, _CustomJoin<FSB, _CustomJoin<FSC, _CustomJoin<FSD, _CustomJoin<FSE, _CustomJoin<FSF, _CustomJoin<FSG, _CustomJoin<FSH, FSI>>>>>>>>>;
/* eslint-enable max-len */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compose(...args: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return define(_types.compose.apply<null, typeof args, any>(null, args) as IModelType<IProperties, IEmptyObject>);
}

export const model = <P extends Declaration, O = IEmptyObject>(name: string, properties?: P): Extended<P, O> =>
  define(_types.model(name, properties) as Extended<P, O>);
