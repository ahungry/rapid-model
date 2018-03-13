import * as fs from 'fs'
import * as p from 'process'

import * as _ from 'lodash'
import * as R from 'ramda'

if (p.argv.length < 3) {
  console.log('Try pointing to a JSON Swagger/OpenAPI file with your arg.')
  p.exit(1)
}

const swag = JSON.parse(fs.readFileSync(p.argv[2]).toString('ascii'))

// Map across defs
const models = _.get(swag, 'definitions')

const genModelFn = (key: string, iter: number) => {
  const model = models[key]
  const { properties } = model
  const props: SwagDefPropObj[] = []
  let outTypes: string = ''
  let outProps: string = ''
  let outGetters: string = ''

  console.log(properties)

  if (typeof properties === 'object') {
    const propFn = (pkey: string, piter: number) => {
      const prop = properties[pkey]

      return props.push({ name: pkey, ...prop })
    }

    Object.keys(properties).forEach(propFn)

    const propToConstructor = (prop: SwagDefPropObj) => {
      const pdef = _.get(prop, 'default', undefined)
      const pmin = _.get(prop, 'minimum', undefined)
      const pmax = _.get(prop, 'maximum', undefined)
      const ptype = _.get(prop, 'type', 'any')
      let type: string = ''

      if (['integer'].includes(ptype)) {
        type = 'number'
      }

      if (['string'].includes(ptype)) {
        type = 'string'
      }

      return {
        construct: `protected ${prop.name}: ${type} = ${pdef},`,
        getters: `public get${prop.name.substr(0, 1).toUpperCase()}${prop.name.substr(1)}() {
return this.${prop.name}
}`,
        types: `${prop.name}: ${type}`
      }
    }

    const propStrings = R.map(propToConstructor, props)
    const construct = R.pluck('construct')(propStrings)
    const getters = R.pluck('getters')(propStrings)
    const types = R.pluck('types')(propStrings)
    outProps = construct.join('\n')
    outGetters = getters.join('\n')
    outTypes = types.join('\n')
  }

  const outClass = `
interface I${key} {
${outTypes}
}
class ${key} implements I${key} {
  constructor(
${outProps}
  )
${outGetters}
}`

  console.log(outClass)
}

Object.keys(models).forEach(genModelFn, models)

interface SwagDefPropObj {
  name: string
  type: string
  default?: number
  minimum?: number
  maximum?: number
}

interface SwagDefProp {
  [key: string]: SwagDefPropObj
}

interface SwagDef {
  type: string
  properties: SwagDefProp
}

interface SwagDefBlock {
  [key: string]: SwagDef
}

interface Swag {
  definitions: SwagDefBlock
}
