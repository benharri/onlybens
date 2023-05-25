import dotenv from 'dotenv'
import FeedGenerator from './server'

const run = async () => {
  dotenv.config()
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid = maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`
  const subscriptionEndpoint = maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ?? 'wss://bsky.social'
  const handle = process.env.FEEDGEN_HANDLE
  const password = process.env.FEEDGEN_APP_PASSWORD

  if (handle == null || password == null) {
    console.log('missing authentication. make sure to set FEEDGEN_HANDLE and FEEDGEN_APP_PASSWORD in .env')
    return
  }

  const server = FeedGenerator.create({
    handle: handle,
    appPassword: password,
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenHost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
    subscriptionEndpoint: subscriptionEndpoint,
    bskyServiceUrl: subscriptionEndpoint.replace('wss', 'https'),
    subscriptionReconnectDelay: maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    publisherDid: maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
    hostname,
    serviceDid,
  })

  await server.start()
  console.log(
    `🤖 running feed generator at http://${server.cfg.listenHost}:${server.cfg.port}`,
  )
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

run()
