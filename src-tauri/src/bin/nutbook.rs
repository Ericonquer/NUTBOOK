use std::{env, fs, process};

use nutbook_backend::{core::cli::{self, CliFailure, CliRequest}, db::Database};

fn main() {
    let mut args = env::args().skip(1).collect::<Vec<_>>();
    if args.as_slice() == ["--version"] { println!("nutbook {}", cli::CLI_VERSION); return; }
    if args.as_slice() == ["--help"] || args.is_empty() { print_help(); return; }
    let json = matches!(args.last().map(String::as_str), Some("--json"));
    if json { args.pop(); }
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

fn exit_failure(json: bool, error: CliFailure) -> ! {
    if json { eprintln!("{}", serde_json::to_string(&error).expect("error json")); } else { eprintln!("nutbook: {}", error.message); }
    process::exit(2)
}

fn print_help() {
    println!("Nutbook CLI\n\nUsage:\n  nutbook add <path> [--json]\n  nutbook remove <path> [--json]\n  nutbook add-project <path> [--json]\n  nutbook remove-project <path> [--json]\n  nutbook doctor [--json]\n  nutbook --version\n  nutbook --help");
}
