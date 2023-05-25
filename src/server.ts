import http from 'http'
import events from 'events'
import express from 'express'
import { DidResolver, MemoryCache } from '@atproto/did-resolver'
import { AtpAgent } from '@atproto/api'
import { createServer } from './lexicon'
import feedGeneration from './methods/feed-generation'
import describeGenerator from './methods/describe-generator'
import { createDb, Database, migrateToLatest } from './db'
import { FirehoseSubscription } from './subscription'
import { AppContext, Config } from './config'
import wellKnown from './well-known'

export class FeedGenerator {
  public app: express.Application
  public server?: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config
  public agent: AtpAgent

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    agent: AtpAgent,
    cfg: Config,
  ) {
    this.app = app
    this.db = db
    this.firehose = firehose
    this.agent = agent
    this.cfg = cfg
  }

  static create(cfg: Config) {
    const app = express()
    const db = createDb(cfg.sqliteLocation)
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)
    const agent = new AtpAgent({ service: cfg.bskyServiceUrl })

    const didCache = new MemoryCache()
    const didResolver = new DidResolver(
      { plcUrl: 'https://plc.directory' },
      didCache,
    )

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
    }
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    app.use(server.xrpc.router)
    app.use(wellKnown(ctx))

    return new FeedGenerator(app, db, firehose, agent, cfg)
  }

  async start(): Promise<http.Server> {
    await migrateToLatest(this.db)

    await this.agent.login({
      identifier: this.cfg.handle,
      password: this.cfg.appPassword,
    })
    console.log('logged in')

    this.firehose.run(this.agent, this.cfg.subscriptionReconnectDelay)
    this.server = this.app.listen(this.cfg.port, this.cfg.listenHost)
    await events.once(this.server, 'listening')
    return this.server
  }
}

export default FeedGenerator
