import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { DidResolver } from '@atproto/did-resolver'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)
    const resolver = new DidResolver()

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    // for (const post of ops.posts.creates) {
    //   console.log(post.record.text)
    // }

    for (const post of ops.posts.creates) {
      let did = await resolver.resolveDid(post.author)
      let isBen = did?.alsoKnownAs?.some(aka => aka.toLowerCase().includes('ben'))

      if (isBen) {
        console.log(did?.alsoKnownAs, post.record.text)
        await this.db
          .insertInto('post')
          .values({
            uri: post.uri,
            cid: post.cid,
            replyParent: post.record?.reply?.parent.uri ?? null,
            replyRoot: post.record?.reply?.root.uri ?? null,
            indexedAt: new Date().toISOString(),
          })
          .onConflict(oc => oc.doNothing())
          .execute()
      }
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
  }
}
