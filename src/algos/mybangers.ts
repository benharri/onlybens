import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

// max 15 chars
export const shortname = 'mybangers'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  console.log('looking up posts for ', params.feed)
  let records = await ctx.agent.com.atproto.repo.listRecords({
    repo: params.feed,
    cursor: params.cursor,
    limit: params.limit,
    collection: '',
  })
  let posts = await ctx.agent.api.app.bsky.feed.getPosts({ uris: records.data.records.map(r => r.uri) })
  if (!posts) throw new InvalidRequestError('failed to get feed')

  let bangers = posts.data.posts
  bangers.sort((a, b) => {
    if (!a.likeCount) return 1
    if (!b.likeCount) return -1
    if (a.likeCount < b.likeCount) return 1
    if (a.likeCount > b.likeCount) return -1
    return 0
  })
  console.log(bangers)
  const feed = bangers.map(b => ({ post: b.uri }))
  const cursor = records.data.cursor
  return { cursor, feed }
}
