const vscode = require("vscode");

async function askGateway() {
  const cfg = vscode.workspace.getConfiguration("fcGateway");
  const baseUrl = (cfg.get("url") || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const userId = cfg.get("userId") || "vscode-user";
  const bearerToken = cfg.get("bearerToken") || "";
  const teamId = cfg.get("teamId") || "engineering";
  const caseId = cfg.get("caseId") || "";
  const processId = cfg.get("processId") || "";
  const confidentiality = cfg.get("confidentiality") || "medium";
  const urgency = cfg.get("urgency") || "normal";
  const preferLowCost = cfg.get("preferLowCost") || false;
  const sendUserInBody = cfg.get("sendUserInBody") || false;

  const editor = vscode.window.activeTextEditor;
  const selectedText =
    editor && !editor.selection.isEmpty
      ? editor.document.getText(editor.selection)
      : "";

  const prompt =
    selectedText ||
    (await vscode.window.showInputBox({
      prompt: "Prompt para o FusioneCore LLM Gateway",
      ignoreFocusOut: true
    }));

  if (!prompt) {
    return;
  }

  const payload = {
    case_id: caseId || null,
    process_id: processId || null,
    prompt,
    confidentiality,
    urgency,
    prefer_low_cost: preferLowCost
  };
  if (sendUserInBody) {
    payload.user_id = userId;
    payload.team_id = teamId;
  }

  const headers = {
    "Content-Type": "application/json"
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "FusioneCore Gateway",
      cancellable: false
    },
    async () => {
      const response = await fetch(`${baseUrl}/llm/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const body = await response.json();
      if (!response.ok) {
        const detail = body && body.detail ? body.detail : `HTTP ${response.status}`;
        vscode.window.showErrorMessage(`Gateway error: ${detail}`);
        return;
      }

      const text = [
        `Provider: ${body.provider}`,
        `Model: ${body.model}`,
        `Route: ${body.route_reason}`,
        `Estimated cost (USD): ${body.estimated_cost_usd}`,
        "",
        body.answer || ""
      ].join("\n");

      const doc = await vscode.workspace.openTextDocument({
        content: text,
        language: "markdown"
      });
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  );
}

function activate(context) {
  const disposable = vscode.commands.registerCommand("fcGateway.askGateway", askGateway);
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
