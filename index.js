var DebugReporter;

DebugReporter = function (newman, reporterOptions, options) {
    const silent = Boolean(options.silent || reporterOptions.silent),
        verbose = Boolean(options.verbose || reporterOptions.verbose),

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
    log("Debug reporter is active.\n");

    if (reporterOptions.forceClearRunSummary) {
        log("! \`forceClearRunSummary\` will remove execution trace after every request.");
        log("  Note that this may have adverse effects on other reporters if they depend");
        log("  on this trace data.");
        newman.on('item', clearSummaryStack);
    }

    // extra line to separate initialisation output from other reporters.
    log("");
};

module.exports = DebugReporter;
