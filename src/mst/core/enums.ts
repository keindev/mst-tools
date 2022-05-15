export enum TypeFlags {
  String = 1,
  Number = 1 << 1,
  Boolean = 1 << 2,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Date = 1 << 3,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Literal = 1 << 4,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Array = 1 << 5,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Map = 1 << 6,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Object = 1 << 7,
  Frozen = 1 << 8,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Optional = 1 << 9,
  Reference = 1 << 10,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Identifier = 1 << 11,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Late = 1 << 12,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Refinement = 1 << 13,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Union = 1 << 14,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Null = 1 << 15,
  Undefined = 1 << 16,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Integer = 1 << 17,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Custom = 1 << 18,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  SnapshotProcessor = 1 << 19,
}
