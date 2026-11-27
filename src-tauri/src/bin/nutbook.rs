use std::{env, fs, process};

use nutbook_backend::{core::cli::{self, CliFailure, CliRequest}, core::nuts, db::Database};

fn main() {
    let mut args = env::args().skip(1).collect::<Vec<_>>();
    if args.as_slice() == ["--version"] { println!("nutbook {}", cli::CLI_VERSION); return; }
    if args.as_slice() == ["--help"] || args.is_empty() { print_help(); return; }
    let json = matches!(args.last().map(String::as_str), Some("--json"));
    if json { args.pop(); }
    if args.first().is_some_and(|arg| arg == "nuts") {
        run_nuts(&args[1..], json);
        return;
    }
    if args.len() == 1 && args[0] == "doctor" {
        let app_data = cli::default_app_data_dir().unwrap_or_else(|error| exit_failure(json, error));
        let report = cli::doctor(&app_data);
        if json { println!("{}", serde_json::to_string(&report).expect("doctor json")); } else { println!("nutbook {}\noverall: {}\napp data: {}\ndatabase: {}\nipc: {}", report.cli_version, report.overall, report.app_data_status, report.database_status, report.ipc_status); }
        process::exit(match report.overall.as_str() { "healthy" => 0, "warning" => 1, _ => 2 });
    }
    if args.len() != 2 || !matches!(args[0].as_str(), "add" | "remove" | "add-project" | "remove-project") {
        exit_failure(json, CliFailure { code: "invalid_command".to_string(), message: "expected one command and one path".to_string() });
    }
    let request = CliRequest { action: args.remove(0), path: args.remove(0), caller_agent: env::var("NUTBOOK_CALLER_AGENT").ok(), paths: None };
    let result = cli::default_app_data_dir()
        .map_err(|error| error)
        .and_then(|app_data| {
            fs::create_dir_all(&app_data).map_err(|_| CliFailure { code: "database_unavailable".to_string(), message: "Nutbook data directory is unavailable".to_string() })?;
            match cli::execute_via_ipc(&app_data, &request)? {
                Some(response) => Ok(response),
                None => {
                    let _lock = cli::acquire_offline_lock(&app_data)?;
                    Database::new(app_data.join("nutbook.sqlite3"))
                    .map_err(|_| CliFailure { code: "database_unavailable".to_string(), message: "Nutbook database is unavailable".to_string() })
                    .and_then(|database| cli::execute(&database, &request))
                },
            }
        })
        ;
    match result {
        Ok(response) if json => println!("{}", serde_json::to_string(&response).expect("response json")),
        Ok(response) => println!("{}: {}", response.status, response.path),
        Err(error) => exit_failure(json, error),
    }
}

fn run_nuts(args: &[String], json: bool) {
    let result = (|| -> Result<serde_json::Value, String> {
        let app_data = cli::default_app_data_dir().map_err(|error| error.message)?;
        let value = match args {
            [operation] if operation == "list" => serde_json::to_value(nuts::list(&app_data)?),
            [operation] if operation == "claim-next" => serde_json::to_value(nuts::claim_next(&app_data, None)?),
            [operation, flag, id] if operation == "claim-next" && flag == "--board" =>
                serde_json::to_value(nuts::claim_next(&app_data, Some(id))?),
            [operation] if operation == "retros" =>
                serde_json::to_value(nuts::retro::list(&app_data, None)?),
            [operation, flag, id] if operation == "retros" && flag == "--board" =>
                serde_json::to_value(nuts::retro::list(&app_data, Some(id))?),
            [operation] if operation == "claim-task" =>
                serde_json::to_value(nuts::retro::claim_scheduled(&app_data, None)?),
            [operation, flag, id] if operation == "claim-task" && flag == "--board" =>
                serde_json::to_value(nuts::retro::claim_scheduled(&app_data, Some(id))?),
            [operation, id, token, path] if operation == "finish-retro" =>
                serde_json::to_value(nuts::retro::finish(&app_data, id, token, std::path::Path::new(path))?),
            [operation, id] if operation == "undo-retro" =>
                serde_json::to_value(nuts::retro::undo(&app_data, id)?),
            [operation] if operation == "boards" => serde_json::to_value(nuts::board::boards(&app_data)?),
            [operation, name, scene] if operation == "create-board" => {
                let language = env::var("NUTBOOK_LANGUAGE").unwrap_or_else(|_| "zh-CN".into());
                let id = nuts::board::create_board(&app_data, name, scene, &language)?;
                Ok(serde_json::json!({ "id": id }))
            }
            [operation, id] if operation == "board-config" => {
                Ok(nuts::settings::config(&app_data, id)?)
            }
            [operation, id, version, name, path] if operation == "save-rules" => {
                let expected = version.parse().map_err(|_| "Expected a rules version number")?;
                let text = nuts::read_markdown(std::path::Path::new(path))?;
                serde_json::to_value(nuts::settings::save_rules(&app_data, id, name, &text, expected)?)
            }
            [operation, id] if operation == "claim" => serde_json::to_value(nuts::claim(&app_data, id, None)?),
            [operation, id, path] if operation == "revise" => {
                let supplement = nuts::read_markdown(std::path::Path::new(path))?;
                serde_json::to_value(nuts::claim(&app_data, id, Some(supplement))?)
            }
            [operation, id, url, title, reason] if operation == "recommend" => {
                let reference_id = nuts::references::recommend(&app_data, id, url, title, reason)?;
                Ok(serde_json::json!({ "id": reference_id }))
            }
            [operation, id, token, path] if operation == "submit" => {
                let version = nuts::submit_file(&app_data, id, token, std::path::Path::new(path))?;
                Ok(serde_json::json!({ "version": version }))
            }
            _ => return Err("Unknown NUTS command or arguments. See nutbook --help.".into()),
        };
        value.map_err(|error| error.to_string())
    })();
    match result {
        Ok(value) => println!("{}", value),
        Err(message) => exit_failure(json, CliFailure { code: "nuts_error".into(), message }),
    }
}

fn exit_failure(json: bool, error: CliFailure) -> ! {
    if json { eprintln!("{}", serde_json::to_string(&error).expect("error json")); } else { eprintln!("nutbook: {}", error.message); }
    process::exit(2)
}

fn print_help() {
    println!("Nutbook CLI\n\nUsage:\n  nutbook add <path> [--json]\n  nutbook remove <path> [--json]\n  nutbook add-project <path> [--json]\n  nutbook remove-project <path> [--json]\n  nutbook doctor [--json]\n  nutbook nuts list [--json]\n  nutbook nuts claim-next [--board <board-id>] [--json]\n  nutbook nuts claim-task [--board <board-id>] [--json]\n  nutbook nuts finish-retro <id> <token> <proposal.json> [--json]\n  nutbook nuts undo-retro <id> [--json]\n  nutbook nuts retros [--board <board-id>] [--json]\n  nutbook nuts boards [--json]\n  nutbook nuts create-board <name> <quick|article|research|product|custom> [--json]\n  nutbook nuts board-config <board-id> [--json]\n  nutbook nuts save-rules <board-id> <version> <name> <path.md> [--json]\n  nutbook nuts claim <issue-id> [--json]\n  nutbook nuts revise <issue-id> <supplement.md> [--json]\n  nutbook nuts recommend <issue-id> <url> <title> <reason> [--json]\n  nutbook nuts submit <issue-id> <token> <draft.md> [--json]\n  nutbook --version\n  nutbook --help");
}
