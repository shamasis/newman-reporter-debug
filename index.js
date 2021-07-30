
var MemWatcher = require('node-memwatcher'),
    DebugReporter;

DebugReporter = function (newman, reporterOptions, options) {
    const silent = Boolean(reporterOptions.silent),
        verbose = Boolean(reporterOptions.verbose),

        // create easy and handy utility functions.
        // these are created here to ensure that they have access to options and instances
        // from the reporter initialisation.
        log = silent ? function () {} : function (...args) { console.log(...args); },
        deb = (verbose && !silent) ? function (...args) { console.debug(...args); } : function () {};

    var clearSummaryStack = function (err, cursor) {
            // setting array lengths to 0 effectively clears the array.
            // we prefer this than simply replacing the array variable
            // with new one.
            newman.summary.run.executions.length = 0;
            newman.summary.run.failures.length = 0;

            deb("- [debug] cleared run summary executions and failures.");
        };

    // banner to let know that the debugger is active. silent flag will suppress this.
    log("✔ Debug reporter is active.\n");

    if (!silent && options.silent) {
        log("✔ [warn] Debug reporter does not respect global `--silent` flag.");
        log("         use --reporter-debug-silent along with --silent\n");
    }

    // all about memory ======================================================
    if (reporterOptions.traceMemory) {
        let graph = Boolean(reporterOptions.traceMemoryGraph),
            memwatchOptions = {
                graph: graph,
                autoHeapDiff: true,
                gcMetrics: true
            };

        log("✔ `traceMemory` will attach inspectors to output memory consumption");
        log("  statistics during the run. To facilitate post process exit stats,");
        log("  the tracing does not stop until you hit CTRL+C. It is preferred");
        log("  that you run a long running collection or add significant iterations.");

        if (graph) {
            log("\n✔ `traceMemoryGraph` is enabled, your other CLI outputs will not be");
            log("  visible.");

            if (!options.silent) {
                log("\n✔ [warn] Graph output will be garbage without enabling --silent flag!");
            }

            memwatchOptions.autoHeapDiff = false;
        }

        MemWatcher.start(memwatchOptions);
        MemWatcher.startStatsInterval();

        newman.on('done', function (err) {
            if (graph) {console.log(Array(24).fill('\n').join(''))} // tmp padding for graph @todo do elegantly later
            log("✔ Collection execution is complete! `traceMemory` will continue to ");
            log("  record until you hit CTRL+C");
        });
    }

    // all about stack cleaning ======================================================

    if (reporterOptions.forceClearRunSummary) {
        log("✔ \`forceClearRunSummary\` will remove execution trace after every request.");
        log("  Note that this may have adverse effects on other reporters if they depend");
        log("  on this trace data.");
        newman.on('item', clearSummaryStack);
    }

    // extra line to separate initialisation output from other reporters.
    log("");

    newman.on('done', function () {
        log("\n✔ Debug reporter inactive.\n")
    })
};

module.exports = DebugReporter;
