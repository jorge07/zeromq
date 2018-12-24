workflow "Test" {
  on = "push"
  resolves = ["Run Tests"]
}

action "Install deps" {
  uses = "actions/npm@e7aaefe"
  runs = "yarn install"
}

action "Run Tests" {
  uses = "actions/npm@e7aaefe"
  runs = "yarn test --coverage"
  needs = ["Install deps"]
}
