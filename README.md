# newman-reporter-debug
This is a debugging reporter for Newman

## Installation

```term
npm i newman-reporter-debug -g;
```

## Usage

```term
newman run examples/sample-collection.json -r debug
```

```term
newman run examples/sample-collection.json -r cli,debug
```

### --reporter-debug-force-clear-run-summary

Newman tracks the executions of each and every request so that some reporters can use the same to do
post-run analyses. `--forceClearRunSummary` stops the recording of this data. Note that this may 
have adverse effects on other reporters if they depend on this trace data.
