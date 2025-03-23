import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const storageKey = "selectedMarkdownNote";

    /**
     * Function to get the `.vscode/md_bookmark/` folder
     */
    function getBookmarksFolder(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage("No workspace folder found.");
            return "";
        }
		const bookmarksFolder = path.join(workspaceFolders[0].uri.fsPath, '.vscode/md_bookmark/');

		// Check if the folder exists, if not, create it
		if (!fs.existsSync(bookmarksFolder)) {
			fs.mkdirSync(bookmarksFolder, { recursive: true });
			vscode.window.showInformationMessage(`Created folder: ${bookmarksFolder}`);
		}
	
		return bookmarksFolder;
    }

    /**
     * Command: Create New Markdown Bookmark Note
     */
    let createMarkdownNote = vscode.commands.registerCommand('extension.createMarkdownNote', async () => {
        const bookmarksFolder = getBookmarksFolder();
        if (!bookmarksFolder) return;

        // Ensure the folder exists
        if (!fs.existsSync(bookmarksFolder)) {
            fs.mkdirSync(bookmarksFolder, { recursive: true });
        }

        // Ask user for the Markdown note name
        let noteName = await vscode.window.showInputBox({
            prompt: "Enter a name for the new Markdown Bookmark Note",
			value: "my_notes"
        });

        if (!noteName) return; // User canceled

		let notePath = path.join(bookmarksFolder, `${noteName}.md`);

        // Check if the file already exists
		let version = 2;
        while (fs.existsSync(notePath)) {
            noteName = await vscode.window.showInputBox({
                prompt: "This note already exists. Enter a different name:",
				value: "my_notes_" + version

            });
            if (!noteName) return;
			notePath = path.join(bookmarksFolder, `${noteName}.md`);
			version++;
        }



        // Create the new Markdown file
        fs.writeFileSync(notePath, `## 📌 ${noteName} Bookmarks\n\n`);
        vscode.window.showInformationMessage(`Markdown note '${noteName}' created.`);

        // Save the selected note in globalState
        context.globalState.update(storageKey, noteName);
    });

    /**
     * Command: Switch Markdown Bookmark Note
     */
    let switchMarkdownNote = vscode.commands.registerCommand('extension.switchMarkdownNote', async () => {
        const bookmarksFolder = getBookmarksFolder();
        if (!bookmarksFolder) return;

        // Read all markdown files in the folder
        const files = fs.readdirSync(bookmarksFolder)
            .filter(file => file.endsWith('.md'))
            .map(file => file.replace('.md', ''));

        if (files.length === 0) {
            vscode.window.showErrorMessage("No Markdown Bookmark Notes found. Create one first.");
            return;
        }

        // Show quick pick selection
        const selectedNote = await vscode.window.showQuickPick(files, {
            placeHolder: "Select a Markdown Bookmark Note"
        });

        if (selectedNote) {
            context.globalState.update(storageKey, selectedNote);
            vscode.window.showInformationMessage(`Switched to '${selectedNote}' Bookmark Note.`);
        }
    });

    /**
     * Command: Create New Markdown Bookmark
     */
    let createMarkdownBookmark = vscode.commands.registerCommand('extension.createMarkdownBookmark', async () => {
        const bookmarksFolder = getBookmarksFolder();
        if (!bookmarksFolder) return;

        let selectedNote = context.globalState.get<string>(storageKey);

        // If no note is selected, ask user to select or create one
        if (!selectedNote) {
            const choice = await vscode.window.showQuickPick(["Select a Markdown Note", "Create a New Markdown Note"], {
                placeHolder: "No Markdown Note selected."
            });

            if (choice === "Select a Markdown Note") {
                await vscode.commands.executeCommand("extension.switchMarkdownNote");
                selectedNote = context.globalState.get<string>(storageKey);
            } else if (choice === "Create a New Markdown Note") {
                await vscode.commands.executeCommand("extension.createMarkdownNote");
                selectedNote = context.globalState.get<string>(storageKey);
            }
        }

        if (!selectedNote) return;

        // Get file path and line number
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor.");
            return;
        }
        const filePath = editor.document.uri.fsPath;
        const lineNumber = editor.selection.active.line + 1;

        // Ask user for bookmark text
        const linkText = await vscode.window.showInputBox({
            prompt: "Enter the bookmark name",
            value: "Bookmark",
			ignoreFocusOut: true
        });

        if (!linkText) return;

        // Format the Markdown link
        const markdownLink = `- [${linkText}](file://${filePath}#L${lineNumber})\n`;

        // Append the bookmark to the selected Markdown file
        const noteFilePath = path.join(bookmarksFolder, `${selectedNote}.md`);
        fs.appendFileSync(noteFilePath, markdownLink);

        vscode.window.showInformationMessage(`Bookmark saved to '${selectedNote}'`);
    });

    context.subscriptions.push(createMarkdownNote, switchMarkdownNote, createMarkdownBookmark);
}

export function deactivate() {}