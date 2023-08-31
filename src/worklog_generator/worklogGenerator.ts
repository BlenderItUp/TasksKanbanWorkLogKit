import { Notice, App, TFile } from "obsidian";

export class WorklogGen {
	private app: App;
	private static readonly WORK_FILE_PATH = "Work/Work.md";
	private static readonly WORKLOG_REGEX =
		/9:00am - 10:30am[\s\S]*01:00pm - 5:00pm/g;

	constructor(app: App) {
		this.app = app;
	}

	private displayError(message: string) {
		new Notice(message);
		console.error(message);
	}

	private getToday(): string {
		const now = new Date();
		const day = String(now.getDate()).padStart(2, "0");
		const month = String(now.getMonth() + 1).padStart(2, "0");
		return `${day}-${month}-${now.getFullYear()}`;
	}

	private prepareTasks(lines: string[]): [string[], string[]] {
		const tasksToday = [];
		const modifiedTasks = [];
		const todayStr = this.getToday();
		console.log(lines);
		for (const line of lines) {
			if (line.includes(todayStr)) {
				const taskMatch = line.match(/^-\s+\[( |x)\]\s+(.*)/);
				if (taskMatch) {
					tasksToday.push(taskMatch[2]);

					let baseTask = taskMatch[2].split(" 🛫 ")[0];
					baseTask = baseTask.split(" ✅ ")[0];

					const startTimeMatch = taskMatch[2].match(
						/🛫 (\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{2}[ap]m)/
					);
					const finishTimeMatch = taskMatch[2].match(
						/✅ (\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{2}[ap]m)/
					);

					let taskSuffix = "";
					if (startTimeMatch) {
						taskSuffix += ` 🛫 ${startTimeMatch[1]}`;
					}
					if (finishTimeMatch) {
						taskSuffix += ` ✅ ${finishTimeMatch[1]}`;
					}

					if (taskMatch[1] === "x") {
						modifiedTasks.push(
							`- [x] Finished ${baseTask}${taskSuffix}`
						);
					} else if (line.includes("🛫")) {
						modifiedTasks.push(
							`- [ ] Started ${baseTask}${taskSuffix}`
						);
					}
				}
			}
		}
		console.log([tasksToday, modifiedTasks]);
		return [tasksToday, modifiedTasks];
	}

	private categorizeTaskByTime(task: string): string | null {
		const timeMatch = task.match(/(\d{1,2}:\d{2} ?[ap]m)/);
		if (!timeMatch) return null;
		const timeStr = timeMatch[1];

		const [hoursStr] = timeStr.split(":");
		let hours: number = parseInt(hoursStr);

		if (timeStr.includes("pm") && hours !== 12) hours += 12;
		if (timeStr.includes("am") && hours === 12) hours = 0;

		if (hours < 10 || hours >= 17) return "9:00am - 10:30am";
		if (hours < 12) return "10:30am - 12:00pm";
		return "01:00pm - 5:00pm";
	}

	private categorizeTasks(originalTasks: string[]): Record<string, string[]> {
		const categorizedTasks: Record<string, string[]> = {
			"9:00am - 10:30am": [],
			"10:30am - 12:00pm": [],
			"01:00pm - 5:00pm": [],
		};

		for (const task of originalTasks) {
			const category = this.categorizeTaskByTime(task);
			if (category) categorizedTasks[category].push(task);
		}

		return categorizedTasks;
	}

	public async generateWorklog(): Promise<void> {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf) {
			this.displayError(
				"Couldn't access the editor. Make sure an editor pane is active."
			);
			return;
		}

		const workFileAbstract = this.app.vault.getAbstractFileByPath(
			WorklogGen.WORK_FILE_PATH
		);
		if (!workFileAbstract) {
			this.displayError("Work file not found.");
			return;
		}

		// Ensure the abstract file is a TFile
		if (!(workFileAbstract instanceof TFile)) {
			this.displayError("Work path does not point to a valid file.");
			return;
		}

		const workFile = workFileAbstract as TFile;

		try {
			const workFileContent = await this.app.vault.read(workFile);
			const matches = workFileContent.match(
				new RegExp(`- \\[( |x)\\] (.*)`, "g")
			);

			if (matches && matches.length) {
				const [originalTasks, modifiedTasks] =
					this.prepareTasks(matches);
				const categorized = this.categorizeTasks(originalTasks);

				let newWorklog = "";
				for (const [timeSlot, tasksInSlot] of Object.entries(
					categorized
				)) {
					newWorklog += timeSlot + "\n";
					for (const originalTask of tasksInSlot) {
						const index = originalTasks.indexOf(originalTask);
						if (index !== -1) {
							newWorklog += modifiedTasks[index] + "\n";
						}
					}
					newWorklog += "\n";
				}

				const currentFile = activeLeaf.view.file;
				const currentFileContent = await this.app.vault.read(
					currentFile
				);
				const newContent =
					currentFileContent
						.replace(WorklogGen.WORKLOG_REGEX, "")
						.trim() +
					"\n\n" +
					newWorklog;
				await this.app.vault.modify(currentFile, newContent);
			}
		} catch (err) {
			this.displayError(`Error processing worklog. ${err.message}`);
		}
	}
}
