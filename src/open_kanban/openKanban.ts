import { App, Notice, TFile, WorkspaceLeaf } from "obsidian";

export default class OpenKanban {
	private app: App;
	private filePath: string;

	constructor(app: App, filePath: string) {
		this.app = app;
		this.filePath = filePath;
	}

	checkLeaf(leaf: WorkspaceLeaf): boolean {
		if (
			leaf.view.getViewType() === "kanban" &&
			leaf.view.file &&
			leaf.view.file.path === this.filePath
		) {
			console.log(leaf.view);
			this.app.workspace.setActiveLeaf(leaf);
			return true;
		}
		return false;
	}
	traverseWorkspaceItem(item: any): boolean {
		if (item.children) {
			for (const child of item.children) {
				if (this.traverseWorkspaceItem(child)) {
					return true;
				}
			}
		} else {
			return this.checkLeaf(item);
		}
		return false;
	}

	findAndOpenOrFocusFile(): void {
		let found = false;

		app.workspace.iterateAllLeaves((leaf) => {
			if (this.checkLeaf(leaf)) {
				found = true;
			}
		});

		if (!found) {
			try {
				const fileToOpen = this.app.vault.getAbstractFileByPath(
					this.filePath
				);
				if (fileToOpen instanceof TFile) {
					const newLeaf = this.app.workspace.getLeaf(true);
					newLeaf.openFile(fileToOpen);
				} else {
					new Notice(
						"Error: The file Work/Work.md is not present in the vault."
					);
				}
			} catch (error) {
				new Notice(`An error occurred: ${error.message}`);
			}
		}
	}
}
