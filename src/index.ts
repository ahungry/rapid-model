import * as p from 'process'

if (!p.argv) {
  console.log('Try pointing to a file with your arg.')
  p.exit(1)
}

console.log(p.argv)

console.log('Hello world')
