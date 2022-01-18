export class Payane {
    constructor(char) {
        this.char = char
    }

    isEqual(p) {
        return p.char === this.char
    }

    toString() {
        return this.char
    }
}

export class Variable {
    constructor(name) {
        this.name = name
    }

    isEqual(v) {
        return v.name === this.name
    }

    toString() {
        return this.name
    }
}

export class Predict {

    constructor(items) {
        this.items = items
    }

    isEqual(predict) {
        if (predict.items.length !== this.items.length)
            return false
        for (let i = 0; i < this.items.length; i++) {
            if (!(predict.items[i].isEqual(this.items[i]))) {
                return false;
            }
        }

        return true
    }
}

export class Rule {
    constructor(leftVariable, predict) {
        this.leftVariable = leftVariable
        this.predict = predict
    }

    isEqual(rule) {
        return rule.leftVariable.isEqual(this.leftVariable) && this.predict.isEqual(rule.predict)
    }
}

export class State {
    constructor(rules, dots, predictions = null) {
        this.rules = rules
        this.dots = dots
        this.predictions = predictions || Array(dots.length).fill([])
    }

    toString() {
        return this.number
    }

    getTotalForwards() {
        return this.forwards ? this.forwards.length : 0
    }

    isEqual(state) {
        if (this.dots.length !== state.dots.length) {
            return false
        }

        const alreadySeenDots = []
        for (let i = 0; i < this.rules.length; i++) {
            const rule = this.rules[i]
            const foundRules = []
            state.rules.forEach((_rule, index) => {
                if (_rule.isEqual(rule)) {
                    foundRules.push({
                        rule, index
                    })
                }
            })
            const foundRule = foundRules.find(r => {
                return !alreadySeenDots.includes(r.index)
            })

            if (!foundRule || this.dots[i] !== state.dots[foundRule.index]) {
                return false
            }
            alreadySeenDots.push(foundRule.index)
        }

        return true
    }

    reachedEnd() {
        let oneOrMoreReachedEnd = false
        let allReachedEnd = true
        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i]
            const rule = this.rules[i]
            if (dot >= rule.predict.items.length) {
                oneOrMoreReachedEnd = true
            } else {
                allReachedEnd = false
            }
        }

        switch (true) {
            case oneOrMoreReachedEnd && allReachedEnd:
                return 2;
            case oneOrMoreReachedEnd:
                return 1;
            default:
                return false;
        }
    }

    reachedEndBy(item) {
        let reached = false
        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i]
            const rule = this.rules[i]
            const length = rule.predict.items.length
            if (rule.predict.items[length - 1].isEqual(item) && !(dot >= length)) {
                return false
            }
            if (dot >= length && rule.predict.items[length - 1].isEqual(item)) {
                reached = true
            }
        }

        return reached
    }

    // متغیر هایی که پشت این متغیر یا پایانه هستن و ببر جلو و اونهایی که رسیدی و برگردون
    goForwardBy(item, initialRules) {
        const reachedVariables = [];
        const dots = []
        const rules = []
        const predictions = []
        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i]
            const rule = this.rules[i]
            const _item = rule.predict.items[dot]
            if (_item && _item.isEqual(item)) {
                dots.push(this.dots[i] + 1)
                rules.push(rule)
                predictions.push(this.predictions[i])
                const reachedItem = rule.predict.items[this.dots[i] + 1]
                if (reachedItem instanceof Variable && !reachedVariables.find(v => (v.isEqual(reachedItem)))) {
                    reachedVariables.push([reachedItem, rule])
                }
            }
        }
        const newState = new State(rules, dots, predictions)
        reachedVariables.forEach(v => {
            this.pushRulesFromInitial(v[0], newState, initialRules, this.predictions)
        })

        newState.forwardedBy = item;
        newState.forwardedFrom = this;
        if (newState.isEqual(this)) {
            this.forwardedFrom = this
            this.forwardedBy = item

            return this
        }

        return newState
    }

    pushRulesFromInitial(v, state, initialRules, predictionSet = []) {
        let rules = state.rules
        let dots = state.dots
        let predictions = state.predictions
        const newRules = initialRules.filter(r => {
            console.log(r)
            return r.leftVariable.isEqual(v)
        })
        newRules.forEach(newRule => {
            if (newRule) {
                const alreadyExists = rules.findIndex(r => (r.isEqual(newRule)))
                if (alreadyExists > -1 && dots[alreadyExists] === 0) {
                    return;
                }
                rules.push(newRule)
                dots.push(0)
                predictionSet.forEach(p => predictions.push(p))
                const first = newRule.predict.items[0]
                const secondFirst = this.findFirst(initialRules, newRule.predict.items[1])

                if (first instanceof Variable) {
                    let predictions = []
                    if (secondFirst && secondFirst.length) {
                        secondFirst.forEach(f => {
                            predictions.push(f)
                        })
                    }
                    this.pushRulesFromInitial(first, state, initialRules, predictions)
                }
            }
        })
    }

    findFirst(initialRules, variable) {
        if (typeof variable === 'undefined') {
            return null
        }
        if (variable instanceof Payane) {
            return [variable]
        }
        const firsts = initialRules.filter(r => (r.leftVariable.isEqual(variable)))
        let final = []
        firsts.forEach(f => {
            final = [...final, this.findFirst(initialRules, f.predict.items[0])]
        })

        return final
    }

    setReference(state, item) {
        if (!this.forwards) {
            this.forwards = []
        }
        this.forwards.push({
            to: state,
            by: item
        })
    }

    // گرفتن آیتم هایی که الان نقطه قبلشون وایساده
    getCurrentItems() {
        const items = []
        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i]
            const rule = this.rules[i]
            const item = rule.predict.items[dot]
            item && !items.find(i => i.isEqual(item)) && items.push(item)
        }

        return items
    }

    findForwardByItem(item) {
        return this.forwards && this.forwards.find(f => (f.by.isEqual(item)))
    }
}


export class stateContainer {
    addState(state) {

    }
}
