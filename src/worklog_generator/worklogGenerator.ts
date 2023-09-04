import { Notice, App, TFile } from "obsidian";

export class WorklogGen {
	private app: App;
	private static readonly WORK_FILE_PATH = "Work/Work.md";
	private static readonly WORKLOG_REGEX =
	/9:00am - 10:30am[\s\S]*/;

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

	private prepareTasks(lines: string[]): string[] {
		const tasksToday = [];
		const modifiedTasks = [];
		const todayStr = this.getToday();
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
					if (startTimeMatch && !finishTimeMatch) {
						taskSuffix += ` 🛫 ${startTimeMatch[1]}`;
					}
					if (
						(finishTimeMatch && !startTimeMatch) ||
						(finishTimeMatch && startTimeMatch)
					) {
						taskSuffix += ` ✅ ${finishTimeMatch[1]}`;
					}

					if (taskMatch[1] === "x") {
						modifiedTasks.push(
							`- [x] Finished ${baseTask}${taskSuffix}`
						);
					}  
					if (line.includes("🛫") && finishTimeMatch) {
						modifiedTasks.push(
							`- [x] Started ${baseTask} ${startTimeMatch[0]}`
						);
					}else if(startTimeMatch && !finishTimeMatch){
						modifiedTasks.push(
							`- [ ] Started ${baseTask} ${startTimeMatch[0]}`
						);
					}
				}
			}
		}
		function extractDateTime(task: string): Date | null {
			const regex = /\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{2}[ap]m/g;
			const matches = [...task.matchAll(regex)];
		
			if (!matches.length) return null;
		
			const lastDatetime = matches[matches.length - 1][0];  // Getting the last match
		
			const [day, month, year, hourStr, minute] = lastDatetime.match(/\d+/g) || [];
			let hour = parseInt(hourStr);
			if (lastDatetime.includes("pm") && hour !== 12) hour += 12;
			if (lastDatetime.includes("am") && hour === 12) hour = 0;
		
			return new Date(
				parseInt(year),
				parseInt(month) - 1,
				parseInt(day),
				hour,
				parseInt(minute)
			);
		}

		modifiedTasks.sort((a, b) => {
			const dateA = extractDateTime(a);
			const dateB = extractDateTime(b);
			if (dateA && dateB) {
				return dateA.getTime() - dateB.getTime();
			}
			return 0;
		});
		return modifiedTasks;
	}

	private categorizeTaskByTime(task: string): string | null {
		const timeMatch = task.match(/(\d{1,2}:\d{2} ?[ap]m)/);
		if (!timeMatch) return null;
	
		const timeStr = timeMatch[1];
		const taskTime = this.timeStrToDate(timeStr);
		// console.log("timeMatch");

		// console.log(timeMatch);
		// console.log(taskTime);

		const start1 = this.timeStrToDate("1:00am");
		const end1 = this.timeStrToDate("10:30am");
	
		const start2 = this.timeStrToDate("10:30am");
		const end2 = this.timeStrToDate("12:00pm");
	
		if (taskTime >= start1 && taskTime <= end1) return "9:00am - 10:30am";
		if (taskTime >= start2 && taskTime <= end2) return "10:30am - 12:00pm";
		return "01:00pm - 5:00pm";
	}
	
	private timeStrToDate(timeStr: string): Date {
		const [hoursStr, minutesStr] = timeStr.split(":");
		let hours: number = parseInt(hoursStr);
		const minutes: number = parseInt(minutesStr);
	
		if (timeStr.includes("pm") && hours !== 12) hours += 12;
		if (timeStr.includes("am") && hours === 12) hours = 0;
	
		// Create a date object for today at the specified time
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);
	
		return date;
	}
	

	private categorizeTasks(originalTasks: string[]): Record<string, string[]> {
		const categorizedTasks: Record<string, string[]> = {
			"9:00am - 10:30am": [],
			"10:30am - 12:00pm": [],
			"01:00pm - 5:00pm": [],
		};
		//console.log("originalTasks")

		//console.log(originalTasks)

		for (const task of originalTasks) {
			const category = this.categorizeTaskByTime(task);
			if (category) categorizedTasks[category].push(task);
		}
		console.log("originalTasks")

		console.log(categorizedTasks)
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
				const modifiedTasks =
					this.prepareTasks(matches);
				const categorized = this.categorizeTasks(modifiedTasks);

				let newWorklog = "";
				for (const [timeSlot, tasksInSlot] of Object.entries(
					categorized
				)) {
					console.log([timeSlot, tasksInSlot])
					newWorklog += timeSlot + "\n";
					for (const task  of tasksInSlot) {
		

							newWorklog += task  + "\n";
						
					}
					newWorklog += "\n";
				}

				const currentFile = activeLeaf.view.file;
				const currentFileContent = await this.app.vault.read(
					currentFile
				);
				
				const newContent = currentFileContent.replace(WorklogGen.WORKLOG_REGEX, '').trim() + "\n\n" + newWorklog;
await this.app.vault.modify(currentFile, newContent);
			}
		} catch (err) {
			this.displayError(`Error processing worklog. ${err.message}`);
		}
	}
}
