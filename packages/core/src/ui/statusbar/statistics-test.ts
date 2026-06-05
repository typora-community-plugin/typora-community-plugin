import { WordCountStatistic } from "./statistics"


const countUp = (() => {
  let counter = 0
  return () => ++counter
})()

export const TEST_STATS: WordCountStatistic = {
  id: 'count-up',
  name: 'counted times',
  eval(md) {
    return String(countUp())
  },
}
