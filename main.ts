import { Plugin } from "obsidian";
import OpenKanban from "src/open_kanban/openKanban";
import {
	MyPluginSettings,
	DEFAULT_SETTINGS,
	MyPluginSettingTab,
} from "./src/settings/settings";
import { WorklogGen } from "src/worklog_generator/worklogGenerator";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private OpenKanban: OpenKanban;
	worklogGen: WorklogGen;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.worklogGen = new WorklogGen(this.app);

		this.OpenKanban = new OpenKanban(this.app, this.settings.filePath);

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
