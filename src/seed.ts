/**
 * Loads the starting content by hand (it also loads automatically on the first start).
 * Usage: pnpm seed
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { loadDefaults } from './lib/defaults'

const payload = await getPayload({ config })
await loadDefaults(payload)
process.exit(0)
