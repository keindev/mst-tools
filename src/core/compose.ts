/* eslint-disable max-len */
import { _CustomJoin, getPropertyMembers, ModelProperties, types as _types } from 'mobx-state-tree';

import { IEmptyObject, IModelType, IProperties } from '../types';
import { defineEffects } from './override/defineEffects';
import { defineNamed } from './override/defineNamed';
import { defineProps } from './override/defineProps';
import { getFlags } from './utils/getFlags';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compose(...args: any[]): any {
  const store = _types.compose.apply<null, typeof args, unknown>(null, args) as IModelType<IProperties, IEmptyObject>;
  const flags = getFlags(getPropertyMembers(store).properties as IEmptyObject);

  defineNamed(store, flags);
  defineProps(store);
  defineEffects(store, flags);

  return store;
}

export default compose;
