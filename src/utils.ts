export const fail = (message = 'method is not overridden'): Error => new Error(`[mst-tools]: ${message}`);
