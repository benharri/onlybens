export type DatabaseSchema = {
  post: Post
  repost: Repost
  user: User
  ben: Ben
  sub_state: SubState
}

export type Post = {
  uri: string
  cid: string
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
  text: string | null
  author: string | null
  feed: string | null
  likeCount: number
}

export type Repost = {
  uri: string
  cid: string
  indexedAt: string
}

export type SubState = {
  service: string
  cursor: number
}

export type User = {
  did: string
  handle: string
  displayName: string | null
  bio: string | null
  indexedAt: string
}

export type Ben = {
  did: string
}
