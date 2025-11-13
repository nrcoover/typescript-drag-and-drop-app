/// <reference path="models/drag-drop.ts" />
/// <reference path="models/project.ts" />
/// <reference path="state/project-state.ts" />
/// <reference path="util/validation.ts" />
/// <reference path="decorators/autobind.ts" />

namespace App {
	// Component Base Class
	abstract class Component<T extends HTMLElement, U extends HTMLElement> {
		templateElement: HTMLTemplateElement;
		hostElement: T;
		element: U;

		constructor(
			templateId: string,
			hostElementId: string,
			insertAtStart: boolean,
			newElementId?: string
		) {
			this.templateElement = <HTMLTemplateElement>(
				document.getElementById(templateId)!
			);
			this.hostElement = <T>document.getElementById(hostElementId)!;

			const importedNode = document.importNode(
				this.templateElement.content,
				true
			);

			this.element = <U>importedNode.firstElementChild;

			if (newElementId) {
				this.element.id = newElementId;
			}

			this.attach(insertAtStart);
		}

		private attach(insertAtStart: boolean) {
			this.hostElement.insertAdjacentElement(
				insertAtStart ? "afterbegin" : "beforeend",
				this.element
			);
		}

		abstract configure(): void;
		abstract renderContent(): void;
	}

	// ProjectItem Class
	class ProjectItem
		extends Component<HTMLUListElement, HTMLLIElement>
		implements Draggable
	{
		private project: Project;

		get persons() {
			if (this.project.people === 1) {
				return "1 person";
			} else {
				return `${this.project.people} people`;
			}
		}

		constructor(hostId: string, project: Project) {
			super("single-project", hostId, false, project.id);
			this.project = project;

			this.configure();
			this.renderContent();
		}

		@autobind
		dragStartHandler(event: DragEvent) {
			event.dataTransfer!.setData("text/plain", this.project.id);
			event.dataTransfer!.effectAllowed = "move";
		}

		dragEndHandler(_: DragEvent) {
			console.log("DragEnd");
		}

		configure() {
			this.element.addEventListener("dragstart", this.dragStartHandler);
			this.element.addEventListener("dragend", this.dragEndHandler);
		}

		renderContent() {
			this.element.querySelector("h2")!.textContent = this.project.title;
			this.element.querySelector("h3")!.textContent =
				this.persons + " assigned";
			this.element.querySelector("p")!.textContent = this.project.description;
		}
	}

	// ProjectList Class
	class ProjectList
		extends Component<HTMLDivElement, HTMLElement>
		implements DropTarget
	{
		assignedProjects: Project[];

		constructor(private type: "active" | "finished") {
			super("project-list", "app", false, `${type}-projects`);

			this.assignedProjects = [];

			this.configure();
			this.renderContent();
		}

		@autobind
		dragOverHandler(event: DragEvent) {
			if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
				event.preventDefault();

				const listElement = this.element.querySelector("ul")!;
				listElement.classList.add("droppable");
			}
		}

		@autobind
		dropHandler(event: DragEvent) {
			const projectId = event.dataTransfer!.getData("text/plain");
			projectState.moveProject(
				projectId,
				this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
			);
		}

		@autobind
		dragLeaveHandler(event: DragEvent) {
			const listElement = this.element.querySelector("ul")!;
			listElement.classList.remove("droppable");
			console.log(event);
		}

		configure() {
			this.element.addEventListener("dragover", this.dragOverHandler);
			this.element.addEventListener("dragleave", this.dragLeaveHandler);
			this.element.addEventListener("drop", this.dropHandler);

			projectState.addListener((projects: Project[]) => {
				const relevantProjects = projects.filter((project) => {
					if (this.type === "active") {
						return project.status === ProjectStatus.Active;
					}
					return project.status === ProjectStatus.Finished;
				});
				this.assignedProjects = relevantProjects;
				this.renderProjects();
			});
		}

		renderContent() {
			const listId = `${this.type}-projects-list`;
			this.element.querySelector("ul")!.id = listId;
			this.element.querySelector("h2")!.textContent =
				this.type.toUpperCase() + " PROJECTS";
		}

		private renderProjects() {
			const listElement = <HTMLUListElement>(
				document.getElementById(`${this.type}-projects-list`)!
			);

			listElement.innerHTML = "";

			for (const projectItem of this.assignedProjects) {
				new ProjectItem(this.element.querySelector("ul")!.id, projectItem);
			}
		}
	}

	// ProjectInput Class
	class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
		titleInputElement: HTMLInputElement;
		descriptionInputElement: HTMLInputElement;
		peopleInputElement: HTMLInputElement;

		constructor() {
			super("project-input", "app", true, "user-input");

			this.titleInputElement = <HTMLInputElement>(
				this.element.querySelector("#title")
			);
			this.descriptionInputElement = <HTMLInputElement>(
				this.element.querySelector("#description")
			);
			this.peopleInputElement = <HTMLInputElement>(
				this.element.querySelector("#people")
			);

			this.configure();
		}

		configure() {
			this.element.addEventListener("submit", this.submitHandler);
		}

		renderContent() {}

		private gatherUserInput(): [string, string, number] | void {
			const enteredTitle = this.titleInputElement.value;
			const enteredDescription = this.descriptionInputElement.value;
			const enteredPeople = this.peopleInputElement.value;

			const titleValidatable: Validatable = {
				value: enteredTitle,
				required: true,
			};

			const descriptionValidatable: Validatable = {
				value: enteredDescription,
				required: true,
				minLength: 5,
			};

			const peopleValidatable: Validatable = {
				value: +enteredPeople,
				required: true,
				min: 1,
				max: 5,
			};

			if (
				!validate(titleValidatable) ||
				!validate(descriptionValidatable) ||
				!validate(peopleValidatable)
			) {
				alert("Invalid input, please try again!");
				return;
			} else {
				return [enteredTitle, enteredDescription, +enteredPeople];
			}
		}

		private clearInputs(): void {
			this.titleInputElement.value = "";
			this.descriptionInputElement.value = "";
			this.peopleInputElement.value = "";
		}

		@autobind
		private submitHandler(event: Event) {
			event.preventDefault();
			const userInput = this.gatherUserInput();
			if (Array.isArray(userInput)) {
				const [title, description, people] = userInput;
				projectState.addProject(title, description, people);
				this.clearInputs();
			}
		}
	}

	new ProjectInput();
	new ProjectList("active");
	new ProjectList("finished");
}
