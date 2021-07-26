var DebugReporter;

DebugReporter = function (newman, reporterOptions, options) {
    const silent = Boolean(options.silent || reporterOptions.silent),
        verbose = Boolean(options.verbose || reporterOptions.verbose),

        log = silent ? function () {} : function (...args) { console.log(...args); },
        deb = (verbose && !silent) ? function (...args) { console.debug(...args); } : function () {};

    var clearSummaryStack = function (err, cursor) {
            newman.summary.run.executions.length = 0;
            newman.summary.run.failures.length = 0;

            deb("- [debug] cleared run summary executions and failures.");
        };

    log("Debug reporter is active.\n");

    if (reporterOptions.forceClearRunSummary) {
        log("! \`forceClearRunSummary\` will remove execution trace after every request.");
        log("  Note that this may have adverse effects on other reporters if they depend");
        log("  on this trace data.");
        newman.on('item', clearSummaryStack);
    }

    log("");
};

module.exports = DebugReporter;
