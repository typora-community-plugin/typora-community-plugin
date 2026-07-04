import { StatisticHandler } from "./statistics"


const countUp = (() => {
  let counter = 0
  return () => ++counter
})()

export const TEST_STATS: StatisticHandler = {
  id: 'count-up',
  name: 'counted times',
  eval() {
    return String(countUp())
  },
}

export const TEST_SELECTION_STATS: StatisticHandler = {
  id: 'count-up',
  name: 'counted times',
  eval(ctx) {
    return String(countUp())
  },
}
