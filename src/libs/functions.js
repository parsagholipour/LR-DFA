import {Variable, Payane, Rule, Predict} from "./classes";

export function isAlpha(str) {
    if (typeof str === 'undefined') {
        return false
    }
    let regex = /^([a-zA-Z])[a-zA-Z0-9]*$/

    return regex.test(str)
}

export function isNum(str) {
    return !isNaN(str)
}

export function error(message){
    alert(message)
    throw new Error(message)
}

export function extractRules(lines) {
    function isCapital(str) {
        let regex = /^[A-Z]*$/

        return regex.test(str)
    }

    const variables = []
    const payanes = []
    const rules = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const left = line.split('->')[0]
        const right = line.split('->')[1]
        const found = variables.find(v => (v.name === left))
        const leftItem = found ? found : new Variable(left);
        const items = []
        right.split('').forEach(char => {
            if (isCapital(char)) {
                const found = variables.find(v => {
                    return v.name === char
                })
                const v = found || new Variable(char)
                !found && variables.push(v)
                items.push(v)
            } else {
                const found = payanes.find(p => (p.char === char))
                const p = found || new Payane(char)
                !found && payanes.push(p)
                items.push(p)
            }
        })
        const rule = new Rule(leftItem, new Predict(items))
        rules.push(rule)
    }

    return rules;
}

