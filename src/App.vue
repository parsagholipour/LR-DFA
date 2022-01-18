<template>
  <main class="container p-5">
    <form @submit.prevent="submit">
      <p class="text-end">گرامر مورد نظر را وارد کنید</p>
      <b-form-textarea class="mt-2" v-model="code" id="" cols="25" rows="5"></b-form-textarea>
      <b-button type="submit" class="mt-4 px-5" variant="primary">ثبت</b-button>
    </form>
    <transition name="fade">
      <div class="draw" v-if="draw">
        <div :class="{active: hoveringState === state.number}"
             class="state" :style="'min-height:' + calculateMinHeight(state.getTotalForwards()) + 'px'"
             v-for="state in finalStates" :key="state.number">
          <div @mouseenter="onForwardEnter(forward)" @mouseleave="onForwardLeave"
               class="forward" v-if="state.forwards" v-for="(forward, indexForward) in state.forwards"
               :style="'top:' + ( calculateMinHeight(indexForward)) + 'px'">
            <span class="forward__arrow">
              <ArrowRightSvg/>
            </span>
            <span class="forward__to">{{ forward.to }}</span>
            <span class="forward__by">{{ forward.by }}</span>
          </div>
          <div class="state__number">{{ state.number }}</div>
          <div class="rule" v-for="(rule, indexRule) in state.rules">
            <div>
              <span>{{ rule.leftVariable }}</span><span>-></span>
              <span>
              <span v-for="(item, indexItem) in rule.predict.items">
                <span v-if="state.dots[indexRule] === indexItem">.</span>
                <span>{{ item }}</span>
                <span v-if="((indexItem + 1) === rule.predict.items.length) &&
                 state.dots[indexRule]  === rule.predict.items.length">.</span>
              </span>
            </span>
            </div>
            <div>
              <span>{</span>
              <span v-for="item in state.predictions[indexRule]">{{ item }}</span>
              <span>}</span>
            </div>
          </div>
        </div>
        <table class="table table-info">
          <thead>
          <tr>
            <th>شماره حالات</th>
            <th v-for="payane in extractItems().payanes" :key="payane">
              {{ payane }}
            </th>
            <th v-for="variable in extractItems().variables" :key="variable">
              {{ variable }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="state in finalStates" :key="state">
            <td>{{ state }}</td>
            <td v-for="payane in extractItems().payanes" :key="payane">
              <template v-if="state.reachedEndBy(payane)">R</template>
              <template v-else>{{
                  state.findForwardByItem(payane) ?
                      state.findForwardByItem(payane).to.number : ''
                }}
              </template>
            </td>
            <td v-for="variable in extractItems().variables" :key="variable">
              <template v-if="state.reachedEndBy(variable)">R</template>
              <template v-else>{{
                  state.findForwardByItem(variable) ?
                      state.findForwardByItem(variable).to.number : ''
                }}
              </template>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </transition>
  </main>
</template>
<script>
import {Payane, State, Variable, Rule, Predict} from "./libs/classes";
import {extractRules, error} from "./libs/functions";
import ArrowRightSvg from "./components/ArrowRightSvg.vue";
import {BFormTextarea, BButton} from 'bootstrap-vue-3'

export default {
  name: 'App',
  components: {ArrowRightSvg, BFormTextarea, BButton},
  data() {
    return {
      code: 'S->a',
      states: [],
      draw: false,
      finalStates: [],
      hoveringState: ''
    }
  },
  methods: {
    onForwardEnter(forward) {
      this.hoveringState = forward.to.number
    },
    onForwardLeave() {
      this.hoveringState = ''
    },
    calculateMinHeight(totalForwards) {
      return totalForwards * 100
    },
    doDraw() {
      this.draw = true
    },
    submit() {
      this.reset()
      const code = this.code;
      const separator = code.includes('\r\n') ? '\r\n' : '\n'
      const lines = code.split(separator).map(l => l.replaceAll(' ', ''))
      const rules = extractRules(lines)
      this.validateRules(rules)
      this.addDollarRule(rules)
      this.initialRules = rules
      const initialState = this.generateInitState()
      this.c = 0
      this.states.push(initialState)
      while (this.goNextState()) {
      }
      this.doDraw()
      // console.log(this.finalStates)
    },
    addDollarRule(rules) {
      const sPerim = new Variable('S\'')
      const dollarPayane = new Payane('$')
      rules.unshift(new Rule(sPerim,
          new Predict([new Variable('S'), dollarPayane]), [dollarPayane]))
    },
    validateRules(rules) {
      let hasError = true
      rules.forEach(r => {
        if (r.leftVariable.name === 'S') {
          hasError = false
        }
      })
      if (hasError) {
        error('حداقل یک قانون S الزامی است')
      }
    },
    reset() {
      this.draw = false
      this.states = []
      this.finalStates = []
    },
    generateInitState() {
      const rules = this.initialRules.filter(r => (r.leftVariable.name === 'S\''))
      const manfiState = new State(rules, [0])
      manfiState.number = 0
      manfiState.predictions = [new Payane('$')]
      manfiState.pushRulesFromInitial(manfiState.rules[0].predict.items[0], manfiState, this.initialRules, manfiState.predictions)

      return manfiState
    },
    goNextState() {
      const currentState = this.states.pop()
      this.finalStates.push(currentState)
      const newStates = this.generateAllStates(currentState)
      newStates.forEach(state => {
        const alreadyExists = this.finalStates.find(s => (s.isEqual(state)))
        let _state = alreadyExists || state
        currentState.setReference(_state, _state.forwardedBy)

        if (!alreadyExists) {
          _state.number = ++this.c
          this.states.push(_state)
        }
      })

      return this.states.length
    },
    /** @param {State} state **/
    generateAllStates(state) {
      if (state.reachedEnd() === 2) {
        return []
      }
      const states = []
      const forwardedItems = []
      const currentItems = state.getCurrentItems()
      currentItems.forEach(item => {
        const alreadyForwarded = forwardedItems.find(i => (i.isEqual(item)))
        if (alreadyForwarded) return;
        forwardedItems.push(item)
        const newState = state.goForwardBy(item, this.initialRules)
        const alreadyAdded = states.find(s => (s.isEqual(newState)))
        if (alreadyAdded) return;
        states.push(newState)
      })

      return states
    },
    extractItems() {
      if (!this.initialRules) return;
      const variables = []
      const payanes = []
      this.initialRules.forEach(r => {
        r.predict.items.forEach(item => {
          if (item instanceof Variable) {
            const alreadyExists = variables.find(v => (v.isEqual(item)))
            !alreadyExists && variables.push(item)
          } else {
            const alreadyExists = payanes.find(v => (v.isEqual(item)))
            !alreadyExists && payanes.push(item)
          }
        })
      })

      return {
        variables, payanes
      }
    }
  },
  computed: {
    // Extract variables and payanes

  }
}
</script>
<style scoped>
a {
  color: #42b983;
}

.state {
  background: lightsteelblue;
  border: 1px solid black;
  padding: 1rem;
  margin-bottom: 10px;
  width: 400px;
  position: relative;
}

.state.active {
  background: #ff5858;
}

.state__number {
  position: absolute;
  left: -35px;
  top: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #98c6ff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.draw {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  column-gap: 200px;
}

.forward {
  position: absolute;
  right: 0;
  transform: translateX(100%);
  display: flex;
}

.forward__arrow {
  color: #18457c;
}

.forward__by {
  position: absolute;
  left: 35%;
  top: 20%;
  font-weight: bold;
  transform: translate(-50%, -50%);
}

.forward__to {
  position: absolute;
  right: 0;
  top: 50%;
  font-weight: bold;
  transform: translate(150%, -50%);
}

.rule {
  display: flex;
  gap: 1rem;
}
</style>
