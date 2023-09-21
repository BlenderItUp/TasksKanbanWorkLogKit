import { Plugin, TFile } from "obsidian";
import OpenKanban from "src/open_kanban/openKanban";
import {
	MyPluginSettings,
	DEFAULT_SETTINGS,
	MyPluginSettingTab,
} from "./src/settings/settings";
import { WorklogGen } from "src/worklog_generator/worklogGenerator";
import { KanbanStamp } from "src/kanban_controller/kanbanStamp";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private OpenKanban: OpenKanban;
	worklogGen: WorklogGen;
	KanbanStamp: KanbanStamp;
	private fileModifyHandler: any;
	private isInternalChange = false;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.worklogGen = new WorklogGen(this.app);

		this.OpenKanban = new OpenKanban(this.app, this.settings.filePath);
		this.KanbanStamp = new KanbanStamp(this.app);

		this.addRibbonIcon("dice", "Open Work.md", () => {
			this.OpenKanban.findAndOpenOrFocusFile();
		});

		this.addSettingTab(new MyPluginSettingTab(this.app, this));

		this.addCommand({
			id: "generate-worklog",
			name: "Generate Worklog",
			callback: () => {
				this.worklogGen.generateWorklog();
			},
		});

		this.addCommand({
			id: "kanBAN",
			name: "kanBAN",
			callback: () => {
				this.KanbanStamp.stamp();
			},
		});
		//sadf
		this.fileModifyHandler = async (file: TFile) => {
			if (file.path === "Work/Work.md" && !this.isInternalChange) {
				this.isInternalChange = true; // Set the flag

				// If this.KanbanStamp.stamp() is asynchronous, you should await it
				console.log("start");
				await this.KanbanStamp.stamp();
				console.log("finish");
				this.isInternalChange = false; // Reset the flag AFTER the modification is completed
			}
		};

		// Add event listener
		this.app.vault.on("modify", this.fileModifyHandler);
	}

	onunload() {
		// Remove event listener
		this.app.vault.off("modify", this.fileModifyHandler);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
