import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

// max 15 chars
export const shortname = 'mybangers'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  let response = await ctx.agent.api.app.bsky.feed.getAuthorFeed({
    actor: params.feed,
    cursor: params.cursor,
    limit: params.limit,
  })
  if (!response) throw new InvalidRequestError('failed to get feed')

  let bangers = response.data.feed
  bangers.sort((a, b) => {
    if (!a.post.likeCount) return 1;
    if (!b.post.likeCount) return -1;
    if (a.post.likeCount < b.post.likeCount) return 1
    if (a.post.likeCount > b.post.likeCount) return -1
    return 0
  })
  console.log(bangers)
  const feed = bangers.map(b => ({ post: b.post.uri }))
  const cursor = response.data.cursor
  return { cursor, feed }
}

