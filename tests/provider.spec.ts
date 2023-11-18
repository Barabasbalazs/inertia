import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'

import { defineConfig } from '../index.js'
import InertiaMiddleware from '../src/inertia_middleware.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Inertia Provider', () => {
  test('register inertia provider', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({ rcFileContents: { providers: ['../../providers/inertia_provider.js'] } })
      .withCoreConfig()
      .withCoreProviders()
      .merge({ config: { inertia: defineConfig({ rootView: 'root' }) } })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.instanceOf(await app.container.make(InertiaMiddleware), InertiaMiddleware)
  })
})