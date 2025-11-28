import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('irisImporter.openForm', (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'irisImportForm',
            'Import to IRIS Docker Container',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent(uri.fsPath);

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'submit':
                        await handleImport(message.data);
                        panel.dispose();
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);

}

async function handleImport(data: any) {
    
	const config = vscode.workspace.getConfiguration('irisImporter');
    const containerName = config.get<string>('containerName') || 'iris';
    const namespace = config.get<string>('namespace') || 'USER';

    const localPath = data.filePath;
    const fileName = path.basename(localPath);
    const containerPath = `/tmp/${fileName}`; 

    const cpCommand = `docker cp "${localPath}" ${containerName}:${containerPath}`;
    
    vscode.window.showInformationMessage(`Copying file to container ${containerName}...`);

    cp.exec(cpCommand, (err, stdout, stderr) => {
        if (err) {
            vscode.window.showErrorMessage(`docker cp error: ${stderr}`);
            return;
        }

        const jsonParams: string[] = [];

        if (data.separator) {
            jsonParams.push(`"columnseparator":"${data.separator}"`);
        }
        if (data.charset) {
            jsonParams.push(`"charset":"${data.charset}"`);
        }
        if (data.useHeader) {
            jsonParams.push(`"header":true`);
        }
        if (data.skipRows && parseInt(data.skipRows) > 0) {
            jsonParams.push(`"skip":${data.skipRows}`);
        }
        if (data.escapeChar) {
             const safeEscape = data.escapeChar === '\\' ? '\\\\' : data.escapeChar;
             jsonParams.push(`"escapechar":"${safeEscape}"`);
        }

        let usingClause = "";
        if (jsonParams.length > 0) {
            usingClause = `USING {"from":{"file":{${jsonParams.join(',')}}}}`;
        }

        const sqlCommand = `LOAD DATA FROM FILE '${containerPath}' INTO ${data.targetTable} ${usingClause}`;

        const terminalName = `IRIS Import: ${fileName}`;
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);
        
        if (!terminal) {
            terminal = vscode.window.createTerminal(terminalName);
        }
        
        terminal.show();

        terminal.sendText(`docker exec -it ${containerName} iris session IRIS -U ${namespace}`);
        
        setTimeout(() => {
            if (terminal) {
                terminal.sendText("DO $SYSTEM.SQL.Shell()");
				terminal.sendText(sqlCommand);
                vscode.window.showInformationMessage('SQL command sent to the terminal.');
            }
        }, 1500);
    });
}

function getWebviewContent(filePath: string) {
    
	const safePath = filePath.replace(/\\/g, '\\\\');

    return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Load Data to InterSystems IRIS</title>
		<style>
			body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); padding: 20px; }
			.form-group { margin-bottom: 15px; }
			label { display: block; margin-bottom: 5px; font-weight: bold; }
			input[type="text"], input[type="number"], select { 
				width: 100%; padding: 8px; box-sizing: border-box; 
				background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border);
			}
			button { 
				background: var(--vscode-button-background); color: var(--vscode-button-foreground); 
				padding: 10px 15px; border: none; cursor: pointer; margin-top: 10px;
			}
			button:hover { background: var(--vscode-button-hoverBackground); }
		</style>
	</head>
	<body>
		<h2>Configure Load Data</h2>
		<div class="form-group">
			<label>File Path (Host)</label>
			<input type="text" id="filePath" value="${safePath}" readonly>
		</div>
		<div class="form-group">
			<label>InterSystems IRIS SQL Table (Ex: SQLUser.Person)</label>
			<input type="text" id="targetTable" placeholder="Schema.Table">
		</div>
		<div class="form-group">
			<label>Skip lines</label>
			<input type="number" id="skipRows" value="0">
		</div>
		<div class="form-group">
			<label>Column separator</label>
			<input type="text" id="separator" value="," placeholder=", or ; or \t">
		</div>
		<div class="form-group">
			<label>Charset</label>
			<input type="text" id="charset" value="UTF-8" placeholder="UTF-8, ISO-8859-1">
		</div>
		<div class="form-group">
			<label>Espace char (Optional)</label>
			<input type="text" id="escapeChar" placeholder="\" maxlength="1">
		</div>

		<button onclick="submitForm()">Load data</button>

		<script>
			const vscode = acquireVsCodeApi();

			function submitForm() {
				const data = {
					filePath: document.getElementById('filePath').value,
					targetTable: document.getElementById('targetTable').value,
					skipRows: document.getElementById('skipRows').value,
					separator: document.getElementById('separator').value,
					charset: document.getElementById('charset').value,
					escapeChar: document.getElementById('escapeChar').value
				};

				if(!data.targetTable) {
					alert('Please provide the destination table.');
					return;
				}

				vscode.postMessage({
					command: 'submit',
					data: data
				});
			}
		</script>
	</body>
	</html>`;
}

export function deactivate() {}
