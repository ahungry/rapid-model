"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const p = require("process");
const _ = require("lodash");
const R = require("ramda");
if (p.argv.length < 3) {
    console.log('Try pointing to a JSON Swagger/OpenAPI file with your arg.');
    p.exit(1);
}
const swag = JSON.parse(fs.readFileSync(p.argv[2]).toString('ascii'));
// Map across defs
const models = _.get(swag, 'definitions');
const genModelFn = (key, iter) => {
    const model = models[key];
    let { properties } = model;
    const props = [];
    let outTypes = '';
    let outProps = '';
    let outGetters = '';
    // It's possible properties isn't defined and instead allOf is
    // this usually indicates a def is extending another in some way.
    let parent;
    if (_.has(model, 'allOf')) {
        const refs = R.pluck('$ref')(model.allOf);
        parent = R.last(refs[0].split('/'));
        const allOfFn = (swagDef) => {
            if (_.has(swagDef, 'properties')) {
                properties = Object.assign({}, properties, swagDef.properties);
            }
        };
        R.map(allOfFn, model.allOf);
    }
    if (typeof properties === 'object') {
        const propFn = (pkey, piter) => {
            const prop = properties[pkey];
            return props.push(Object.assign({ name: pkey }, prop));
        };
        Object.keys(properties).forEach(propFn);
        const propToConstructor = (prop) => {
            const pdef = _.get(prop, 'default', undefined);
            const pmin = _.get(prop, 'minimum', undefined);
            const pmax = _.get(prop, 'maximum', undefined);
            const ptype = _.get(prop, 'type', 'any');
            let type = '';
            let oq = ''; // Add quoting around strings.
            if (['integer'].includes(ptype)) {
                type = 'number';
            }
            if (['string'].includes(ptype)) {
                type = 'string';
                oq = pdef !== undefined ? `'` : '';
            }
            return {
                construct: `    protected ${prop.name}: ${type} = ${oq}${pdef}${oq},`,
                getters: `
  public get${prop.name.substr(0, 1).toUpperCase()}${prop.name.substr(1)}() {
    return this.${prop.name}
  }`,
                types: `  ${prop.name}: ${type}`
            };
        };
        const propStrings = R.map(propToConstructor, props);
        const construct = R.pluck('construct')(propStrings);
        const getters = R.pluck('getters')(propStrings);
        const types = R.pluck('types')(propStrings);
        outProps = construct.join('\n');
        outGetters = getters.join('\n');
        outTypes = types.join('\n');
    }
    const outParent = parent ? `extends ${parent} ` : '';
    // Probably not necessary, as we'll just combine the 2
    // const outSuper = parent ? 'super(arguments)' : ''
    const outSuper = '';
    const outClass = `
interface I${key} ${outParent} {
${outTypes}
}

class ${key} ${outParent}implements I${key} {
  constructor(
${outProps}
  ) {
    ${outSuper}
  }
${outGetters}
}`;
    console.log(outClass);
};
Object.keys(models).forEach(genModelFn, models);
//# sourceMappingURL=index.js.map