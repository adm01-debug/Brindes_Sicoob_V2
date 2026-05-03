import { type ComponentType } from "react";

export type RouteConfig = {
  path: string;
  component: ComponentType<any>;
  exact?: boolean;
};

export interface TypedRoute<P extends string> extends RouteConfig {
  readonly path: P;
}

/**
 * Helper to define routes with strict path types.
 * Use ":param" for dynamic segments.
 */
export function defineRoute<P extends string>(config: TypedRoute<P>): TypedRoute<P> {
  return config;
}

/**
 * Extracts param keys from a path string.
 * Example: "/orders/:id" -> "id"
 */
export type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${string}:${infer Param}`
    ? Param
    : never;

/**
 * Helper to generate path with typed params.
 */
export function generatePath<P extends string>(
  path: P,
  params: Record<ExtractRouteParams<P>, string | number>
): string {
  let result: string = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, String(value));
  }
  return result;
}
