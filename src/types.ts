/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ConfigProvider } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { Serialize, Simplify } from '@tuyau/utils/types'

import type { VersionCache } from './version_cache.js'
import { DeferProp, OptionalProp } from './props.js'

export type MaybePromise<T> = T | Promise<T>

/**
 * Props that will be passed to inertia render method
 */
export type PageProps = Record<string, unknown>

/**
 * Shared data types
 */
export type Data = string | number | object | boolean
export type SharedDatumFactory = (ctx: HttpContext) => MaybePromise<Data>
export type SharedData = Record<string, Data | SharedDatumFactory>

/**
 * Allowed values for the assets version
 */
export type AssetsVersion = string | number | undefined

export interface InertiaConfig<T extends SharedData = SharedData> {
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses.
   * @default root (resources/views/inertia_layout.edge)
   */
  rootView?: string | ((ctx: HttpContext) => string)

  /**
   * Path to your client-side entrypoint file.
   */
  entrypoint?: string

  /**
   * The version of your assets. Every client request will be checked against this version.
   * If the version is not the same, the client will do a full reload.
   */
  assetsVersion?: AssetsVersion

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData?: T

  /**
   * History encryption
   *
   * See https://v2.inertiajs.com/history-encryption
   */
  history?: {
    encrypt?: boolean
  }

  /**
   * Options to configure SSR
   */
  ssr?: {
    /**
     * Enable or disable SSR
     */
    enabled: boolean

    /**
     * List of components that should be rendered on the server
     */
    pages?: string[] | ((ctx: HttpContext, page: string) => MaybePromise<boolean>)

    /**
     * Path to the SSR entrypoint file
     */
    entrypoint?: string

    /**
     * Path to the SSR bundled file that will be used in production
     */
    bundle?: string
  }
}

/**
 * Resolved inertia configuration
 */
export interface ResolvedConfig<T extends SharedData = SharedData> {
  rootView: string | ((ctx: HttpContext) => string)
  versionCache: VersionCache
  sharedData: T
  history: { encrypt: boolean }
  ssr: {
    enabled: boolean
    entrypoint: string
    pages?: string[] | ((ctx: HttpContext, page: string) => MaybePromise<boolean>)
    bundle: string
  }
}

export interface PageObject<TPageProps extends PageProps = PageProps> {
  ssrHead?: string
  ssrBody?: string

  /**
   * The name of the JavaScript page component.
   */
  component: string

  /**
   * The current asset version.
   */
  version: string | number

  /**
   * The page props (data).
   */
  props: TPageProps

  /**
   * The page URL.
   */
  url: string

  /**
   * List of deferred props that will be loaded with subsequent requests
   */
  deferredProps?: Record<string, string[]>

  /**
   * List of mergeable props that will be merged with subsequent requests
   */
  mergeProps?: string[]

  /**
   * Whether or not to encrypt the current page's history state.
   */
  encryptHistory?: boolean

  /**
   *  Whether or not to clear any encrypted history state.
   */
  clearHistory?: boolean
}

type IsOptionalProp<T> =
  T extends OptionalProp<any> ? true : T extends DeferProp<any> ? true : false

type InferProps<T> = {
  // First extract and unwrap lazy props. Also make them optional as they are lazy
  [K in keyof T as IsOptionalProp<T[K]> extends true ? K : never]+?: T[K] extends {
    callback: () => MaybePromise<infer U>
  }
    ? U
    : T[K]
} & {
  // Then include all other props as it is
  [K in keyof T as IsOptionalProp<T[K]> extends true ? never : K]: T[K] extends {
    callback: () => MaybePromise<infer U>
  }
    ? U
    : T[K]
}

type ReturnsTypesSharedData<T extends SharedData> = {} extends T
  ? {}
  : InferProps<{
      [K in keyof T]: T[K] extends (...args: any[]) => MaybePromise<infer U> ? U : T[K]
    }>

/**
 * Infer shared data types from the config provider
 */
export type InferSharedProps<T extends ConfigProvider<ResolvedConfig>> = ReturnsTypesSharedData<
  Awaited<ReturnType<T['resolver']>>['sharedData']
>

/**
 * The shared props inferred from the user config user-land.
 * Should be module augmented by the user
 */
export interface SharedProps {}

/**
 * Helper for infering the page props from a Controller method that returns
 * inertia.render
 *
 * InferPageProps will also include the shared props
 *
 * ```ts
 * // Your Adonis Controller
 * class MyController {
 *  index() {
 *   return inertia.render('foo', { foo: 1 })
 *  }
 * }
 *
 * // Your React component
 * export default MyReactComponent(props: InferPageProps<Controller, 'index'>) {
 * }
 * ```
 */
export type InferPageProps<
  Controller,
  Method extends keyof Controller,
> = Controller[Method] extends (...args: any[]) => any
  ? Simplify<
      Serialize<
        InferProps<Extract<Awaited<ReturnType<Controller[Method]>>, PageObject>['props']> &
          SharedProps
      >
    >
  : never

/**
 * Signature for the method in the SSR entrypoint file
 */
export type RenderInertiaSsrApp = (page: PageObject) => Promise<{ head: string[]; body: string }>
