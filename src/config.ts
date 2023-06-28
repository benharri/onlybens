import { Database } from './db'
import { DidResolver } from '@atproto/did-resolver'
import { AtpAgent } from '@atproto/api'

export type AppContext = {
  db: Database
  didResolver: DidResolver
  cfg: Config
  agent: AtpAgent
}

export type Config = {
  handle: string
  appPassword: string
  port: number
  listenHost: string
  hostname: string
  sqliteLocation: string
  subscriptionEndpoint: string
  serviceDid: string
  bskyServiceUrl: string
  publisherDid: string
  subscriptionReconnectDelay: number
}
