export const $type: unique symbol = Symbol('$type');
// FIXME: rename
export const cannotDetermineSubtype = 'cannotDetermine';

export const DEV_MODE = process.env.NODE_ENV !== 'production';
