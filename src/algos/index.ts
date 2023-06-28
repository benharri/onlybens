import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as onlyBens from './onlybens'
import * as mybangers from './mybangers'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [onlyBens.shortname]: onlyBens.handler,
  [mybangers.shortname]: mybangers.handler,
}

export default algos
