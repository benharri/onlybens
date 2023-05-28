import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { AtpAgent } from '@atproto/api'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent, agent: AtpAgent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // handle post creates
    for (const post of ops.posts.creates) {
      const user = await this.db
        .selectFrom('user')
        .select(['did', 'displayName', 'handle'])
        .where('did', '=', post.author)
        .executeTakeFirst()

      // user not seen before, cache their profile
      if (!user) {
        const profile = await agent.api.app.bsky.actor.getProfile({ actor: post.author })
        console.log(`fetched profile for ${post.author}: @${profile.data.handle} ${profile.data.displayName}`)
        await this.db
          .insertInto('user')
          .values({
            did: post.author,
            handle: profile.data.handle,
            displayName: profile.data.displayName,
            bio: profile.data.description,
            indexedAt: new Date().toISOString(),
          })
          .execute()

        if (profile.data.handle.toLowerCase().includes('ben') || profile.data.displayName?.toLowerCase().includes('ben')) {
          await this.db.insertInto('ben').values({ did: post.author }).execute()
          console.log('new ben collected!!')
          console.log(`${post.author} is ${profile.data.handle} with display name ${profile.data.displayName}`)
        }
      } else if (user.displayName === user.handle) {
        // i was saving handle as displayName... :(
        const profile = await agent.api.app.bsky.actor.getProfile({ actor: post.author })
        console.log(`refetched invalid profile for @${user.handle}. updating displayName to '${profile.data.displayName}'`)
        await this.db
          .updateTable('user')
          .set({ displayName: profile.data.displayName })
          .where('did', '=', post.author)
          .execute()

        if (profile.data.displayName?.toLowerCase().includes('ben')) {
          await this.db.insertInto('ben').values({ did: post.author }).execute()
          console.log('new ben collected!!')
          console.log(`${post.author} is ${profile.data.handle} with display name ${profile.data.displayName}`)
        }
      }

      // re-fetch db record
      const ben = await this.db
        .selectFrom('user')
        .innerJoin('ben', 'ben.did', 'user.did')
        .select(['displayName', 'handle'])
        .where('ben.did', '=', post.author)
        .executeTakeFirst()

      // store ben posts
      if (ben) {
        console.log(ben.displayName, '@', ben.handle, post.record.text)
        await this.db
          .insertInto('post')
          .values({
            uri: post.uri,
            cid: post.cid,
            replyParent: post.record?.reply?.parent.uri ?? null,
            replyRoot: post.record?.reply?.root.uri ?? null,
            indexedAt: new Date().toISOString(),
            text: post.record.text,
            feed: 'bens',
            author: post.author,
          })
          .onConflict(oc => oc.doNothing())
          .execute()
      }
    }

    // handle deletes
    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }

    // handle repost creates
    const bens = await this.db.selectFrom('ben').select('did').execute()
    const repostsToCreate = ops.reposts.creates
      .filter((create) => {
        // only ben posts
        return bens.find((ben) => ben.did === create.author)
      })
      .map((create) => {
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
        }
      })
    if (repostsToCreate.length > 0) {
      await this.db
        .insertInto('repost')
        .values(repostsToCreate)
        .onConflict(oc => oc.doNothing())
        .execute()
    }

    // handle reposts to delete
    const repostsToDelete = ops.reposts.deletes.map((del) => del.uri)
    if (repostsToDelete.length > 0) {
      try {
        await this.db
          .deleteFrom('repost')
          .where('uri', 'in', repostsToDelete)
          .execute()
      } catch (e) {
        console.log('delete failed for whatever reason', repostsToDelete)
      }
    }

  }
}
