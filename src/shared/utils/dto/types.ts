// Utility type to capitalize the first letter of a string
type Capitalize<S extends string> = S extends `${infer T}${infer U}`
  ? `${Uppercase<T>}${U}`
  : S;
// Utility type to convert snake_case to camelCase
type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;
// Generic type transformer to convert DB entity type to DTO type

/**
 * DtoToEntity<T> recursively transforms a DTO type T by converting all its snake_case keys to camelCase keys.
 * - For each property P in T (where P is a string), the key is transformed from snake_case to camelCase using SnakeToCamelCase.
 * - If the property value is an object, the transformation is applied recursively.
 * - This type does NOT alter nullability or optionality; it only changes key casing.
 *
 * Example:
 *   type Input = { some_field: string; nested_obj: { another_field: number | null } };
 *   type Result = DtoToEntity<Input>;
 *   // Result: { someField: string; nestedObj: { anotherField: number | null } }
 */
export type DtoToEntity<T> = {
  [P in keyof T as P extends string
    ? SnakeToCamelCase<P>
    : never]: T[P] extends object ? DtoToEntity<T[P]> : T[P];
};

type CamelCaseToSnake<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? `_${Lowercase<T>}` : T}${CamelCaseToSnake<U>}`
  : S;

export type EntityToDto<T> = {
  [P in keyof T as P extends string ? CamelCaseToSnake<P> : never]: T[P];
};

/**
 * OverrideProps<Base, Overrides>:
 * - Keeps the original optionality (required/optional) of each property in Base.
 * - For any property in Overrides, replaces the type with the one from Overrides.
 * - All other properties retain their type and optionality from Base.
 */
export type OverrideProps<Base, Overrides> = {
  [K in keyof Base]: K extends keyof Overrides ? Overrides[K] : Base[K];
};

export type TContentNested<T = unknown, Item = unknown, Prop extends string = "items"> = T & {
  // eslint-disable-next-line no-unused-vars
  [K in Prop]?: Item[]
}
