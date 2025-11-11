// Project Type
enum ProjectStatus {
	Active,
	Finished,
}

class Project {
	constructor(
		public id: string,
		public title: string,
		public descriptoin: string,
		public peope: number,
		public status: ProjectStatus
	) {}
}

// Project State Management
type Listener = (items: Project[]) => void;

class ProjectState {
	private listeners: Listener[] = [];
	private projects: Project[] = [];
	private static instance: ProjectState;

	private constructor() {}

	static getInstance() {
		if (this.instance) {
			return this.instance;
		}

		this.instance = new ProjectState();
		return this.instance;
	}

	addListener(listenerFunction: Listener) {
		this.listeners.push(listenerFunction);
	}

	addProject(title: string, description: string, numberOfPeople: number) {
		const newProject = new Project(
			Math.random().toString(),
			title,
			description,
			numberOfPeople,
			ProjectStatus.Active
		);

		this.projects.push(newProject);

		for (const listenerFunction of this.listeners) {
			listenerFunction(this.projects.slice());
		}
	}
}

const projectState = ProjectState.getInstance();

// Validation
interface Validatable {
	value: string | number;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
}

const validate = (validatableInput: Validatable) => {
	let isValid = true;

	if (validatableInput.required) {
		isValid = isValid && validatableInput.value.toString().trim().length !== 0;
	}

	if (
		validatableInput.minLength != null &&
		typeof validatableInput.value === "string"
	) {
		isValid =
			isValid && validatableInput.value.length >= validatableInput.minLength;
	}

	if (
		validatableInput.maxLength != null &&
		typeof validatableInput.value === "string"
	) {
		isValid =
			isValid && validatableInput.value.length <= validatableInput.maxLength;
	}

	if (
		validatableInput.min != null &&
		typeof validatableInput.value === "number"
	) {
		isValid = isValid && validatableInput.value >= validatableInput.min;
	}

	if (
		validatableInput.max != null &&
		typeof validatableInput.value === "number"
	) {
		isValid = isValid && validatableInput.value <= validatableInput.max;
	}

	return isValid;
};

// autobind decorator
const autobind = (_: any, _2: string, descriptor: PropertyDescriptor) => {
	const originalMethod = descriptor.value;
	const adjustedDescriptor: PropertyDescriptor = {
		configurable: true,
		get() {
			const boundFunction = originalMethod.bind(this);
			return boundFunction;
		},
	};
	return adjustedDescriptor;
};

// ProjectList Class
class ProjectList {
	templateElement: HTMLTemplateElement;
	hostElement: HTMLDivElement;
	element: HTMLElement;
	assignedProjects: Project[];

	constructor(private type: "active" | "finished") {
		this.templateElement = <HTMLTemplateElement>(
			document.getElementById("project-list")!
		);
		this.hostElement = <HTMLDivElement>document.getElementById("app")!;
		this.assignedProjects = [];

		const importedNode = document.importNode(
			this.templateElement.content,
			true
		);

		this.element = <HTMLElement>importedNode.firstElementChild;
		this.element.id = `${this.type}-projects`;

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

		this.attach();
		this.renderContent();
	}

	private renderProjects() {
		const listElement = <HTMLUListElement>(
			document.getElementById(`${this.type}-projects-list`)!
		);

		listElement.innerHTML = "";

		for (const projectItem of this.assignedProjects) {
			const listItem = document.createElement("li");
			listItem.textContent = projectItem.title;
			listElement.appendChild(listItem);
		}
	}

	private renderContent() {
		const listId = `${this.type}-projects-list`;
		this.element.querySelector("ul")!.id = listId;
		this.element.querySelector("h2")!.textContent =
			this.type.toUpperCase() + " PROJECTS";
	}

	private attach() {
		this.hostElement.insertAdjacentElement("beforeend", this.element);
	}
}

// ProjectInput Class
class ProjectInput {
	templateElement: HTMLTemplateElement;
	hostElement: HTMLDivElement;
	element: HTMLFormElement;

	titleInputElement: HTMLInputElement;
	descriptionInputElement: HTMLInputElement;
	peopleInputElement: HTMLInputElement;

	constructor() {
		this.templateElement = <HTMLTemplateElement>(
			document.getElementById("project-input")!
		);
		this.hostElement = <HTMLDivElement>document.getElementById("app")!;

		const importedNode = document.importNode(
			this.templateElement.content,
			true
		);
		this.element = <HTMLFormElement>importedNode.firstElementChild;
		this.element.id = "user-input";

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
		this.attach();
	}

	private attach() {
		this.hostElement.insertAdjacentElement("afterbegin", this.element);
	}

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

	private configure() {
		this.element.addEventListener("submit", this.submitHandler);
	}
}

const projectInput = new ProjectInput();
const activeProjectList = new ProjectList("active");
const finishedProjectList = new ProjectList("finished");
