/**
 * @fileOverview 
 * 
 * This is a single flat file for this debug reporter. Everything is crammed into single
 * closure of the reporter instantiation to allow ease of quick development.
 * 
 * Once the complexity of the project increases, will consider cleanup.
 */

const prompts = require('prompts'),
    MemWatcher = require('node-memwatcher'),
    Table = require('cli-table3'),
    colors = require('colors');

var DebugReporter;

// Standard newman reporter construction interface
DebugReporter = function (newman, reporterOptions, options) {
    const silent = Boolean(reporterOptions.silent),
        verbose = Boolean(reporterOptions.verbose),

        // create easy and handy utility functions.
        // these are created here to ensure that they have access to options and instances
        // from the reporter initialisation.
        log = silent ? function () {} : function (...args) { console.log(...args); },
        deb = (verbose && !silent) ? function (...args) { console.debug(...args); } : function () {};

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

        newman.on('item', function (err) {
            // setting array lengths to 0 effectively clears the array.
            // we prefer this than simply replacing the array variable
            // with new one.
            try { // putting in try block with abundance of caution
                newman.summary.run.executions.length = 0;
                newman.summary.run.failures.length = 0;
                deb("- [debug] cleared summary stack.");
            }
            catch (e) {
                deb("- [debug] unable to clear summary stack.", e);
            }            
        });
    }

    if (reporterOptions.break) {
        let run,
            operations,
            operationHandler,

            latest = {},

            printVariables,
            printRequest,
            printResponse;


        printVariables = function (varscope, type, json) {
            !type && (type = '');

            if (!(varscope && varscope.values && varscope.values.members && varscope.values.members)) {
                log(`✖ Unable to inspect ${type} variables.`);
                return;
            }

            if (json) {
                process.stdout.write(`\n${colors.underline('Current ' + type)}: `);
                console.dir(varscope.toJSON(), {depth: 4});
                log('');
                return;
            }

            let table = new Table({ head: ["Variable", "Value", "Type"] });

            varscope.values.members.forEach((variable) => {
                table.push([variable.name || variable.key, variable.value, variable.type]);
            });

            log(`\n  ${varscope.name ? varscope.name : type} [id:${varscope.id}]`);
            log(table.toString());
        };

        printRequest = function (sent, original) {

            // augment the object
            if (sent.url) {
                sent.url.raw = sent.url.toString();
            }

            process.stdout.write(`\n${colors.underline('Last Request Sent')}: `);
            console.dir(sent.toJSON(), {depth: 4});
            log('');
        };

        printResponse = function (received) {
            let tmp;

            if (received.stream) {
                received.body = received.text();
                tmp = received.stream;
                delete received.stream;
            }

            process.stdout.write(`\n${colors.underline('Last Response Received')}: `);
            console.dir(received.toJSON(), {depth: 4});
            log('');

            if (tmp) {
                delete received.body;
                received.stream = tmp;
                tmp = null;
            }
        }

        operations = {
            type: 'select',
            name: 'value',
            message: 'Run paused.',
            choices: [
                { title: 'Continue', value: 'continue' },
                { title: 'Show all environment variables', value: 'allenv' },
                { title: 'Show all global variables', value: 'allglb' },
                { title: 'Show Environment', value: 'env' },
                { title: 'Show Globals', value: 'glb' },
                { title: 'Show Request', value: 'req' },
                { title: 'Show Response', value: 'res' },
                { title: 'Exit', value: 'exit' }
            ],
            initial: 0
        };

        operationHandler = function (prompt, answer) {
            try {
                if (answer === 'continue') {
                    run.resume();
                }
                else if (answer === 'allenv') {
                    printVariables(run.state.environment, 'Environment');
                    prompts(operations, { onSubmit: operationHandler });
                }
                else if (answer === 'allglb') {
                    printVariables(run.state.globals, 'Globals');;
                    prompts(operations, { onSubmit: operationHandler });
                }
                else if (answer === 'env') {
                    printVariables(run.state.environment, 'Environment', true);
                    prompts(operations, { onSubmit: operationHandler });
                }
                else if (answer === 'glb') {
                    printVariables(run.state.globals, 'Globals', true);
                    prompts(operations, { onSubmit: operationHandler });
                }
                else if (answer === 'req') {
                    printRequest(latest.request.request, latest.beforeRequest);
                    prompts(operations, { onSubmit: operationHandler });
                }
                else if (answer === 'res') {
                    printResponse(latest.request.response);
                    prompts(operations, { onSubmit: operationHandler });
                }
                else {
                    run.abort();
                }
            } catch (e) {
                console.error(e);
            }
        };

        newman.on('start', function (err, args) {
            run = args && args.run;

            if (!run) {
                log("\n✔ [warn] Unsupported newman version for breakpoints.");
                log("\n✔        Upgrade to latest version of newman.");

                return;
            }
        });

        newman.on('done', function (err, args) {
            run = null;
            latest = {};
        });

        newman.on('beforeRequest', function (err, args) {
            latest.request = null;
            latest.beforeRequest = args.request;
        });

        newman.on('request', function (err, args) {
            latest.request = args;
        });

        newman.on('item', function (err, args) {
            if (!run) {
                return;
            }

            run.pause(function () {
                prompts(operations, { onSubmit: operationHandler });
            });
        });
    }

    // extra line to separate initialisation output from other reporters.
    log("");

    newman.on('done', function () {
        log("\n✔ Debug reporter inactive.\n")
    })
};

module.exports = DebugReporter;
