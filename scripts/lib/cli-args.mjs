export function parseArgs(args) {
  const options = {
    inputJson: null,
    inputDir: null,
    sourceSupabase: false,
    uidMapping: null,
    existingTarget: null,
    outputReport: null,
    apply: false,
    dryRun: false,
    help: false,
  };

  const allowedFlagsWithVal = new Set([
    "--uid-mapping",
    "--input-json",
    "--input-dir",
    "--existing-target",
    "--output-report",
  ]);

  const allowedBooleanFlags = new Set([
    "--apply",
    "--dry-run",
    "--help",
    "-h",
  ]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--source-supabase") {
      options.sourceSupabase = true;
      continue;
    }

    if (allowedBooleanFlags.has(arg)) {
      if (arg === "--help" || arg === "-h") options.help = true;
      else if (arg === "--apply") options.apply = true;
      else if (arg === "--dry-run") options.dryRun = true;
      continue;
    }

    if (allowedFlagsWithVal.has(arg)) {
      const val = args[i + 1];
      if (!val || val.startsWith("-")) {
        throw new Error(`Option '${arg}' requires a value.`);
      }
      i++;
      if (arg === "--uid-mapping") options.uidMapping = val;
      else if (arg === "--input-json") options.inputJson = val;
      else if (arg === "--input-dir") options.inputDir = val;
      else if (arg === "--existing-target") options.existingTarget = val;
      else if (arg === "--output-report") options.outputReport = val;
      continue;
    }

    throw new Error(`Unknown or unexpected argument: '${arg}'. Use --help for usage.`);
  }

  if (options.apply && options.dryRun) {
    throw new Error("Contradictory flags: Cannot specify both --apply and --dry-run.");
  }

  if (!options.help) {
    if (!options.uidMapping) {
      throw new Error("Missing required option: --uid-mapping <path>");
    }

    const sources = [options.inputJson, options.inputDir, options.sourceSupabase].filter(Boolean).length;
    if (sources === 0) {
      throw new Error("Missing required input source: specify either --input-json <path>, --input-dir <path> or --source-supabase.");
    }

    if (sources > 1) {
      throw new Error("Cannot specify more than one of --input-json, --input-dir and --source-supabase. Choose one input source.");
    }
  }

  if (!options.apply && !options.dryRun) {
    options.dryRun = true;
  }

  return options;
}
