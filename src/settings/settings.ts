import { App, PluginSettingTab, Setting, Plugin } from "obsidian";

export interface MyPluginSettings {
	filePath: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	filePath: "Work/Work.md",
};

export class MyPluginSettingTab extends PluginSettingTab {
	plugin: Plugin & {
		settings: MyPluginSettings;
		saveSettings: () => Promise<void>;
	};

	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin as Plugin & {
			settings: MyPluginSettings;
			saveSettings: () => Promise<void>;
		};
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "My Plugin Settings" });

		new Setting(containerEl)
			.setName("File Path")
			.setDesc("Define the file path")
			.addText((text) =>
				text
					.setPlaceholder("Enter file path")
					.setValue(this.plugin.settings.filePath)
					.onChange(async (value) => {
						this.plugin.settings.filePath = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
