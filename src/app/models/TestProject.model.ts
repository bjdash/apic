import { Suite } from "./Suite.model";

export interface TestProject {
    name: string
    owner?: string
    _created?: number
    _id: string
    _modified?: number
}

export interface TreeTestProject extends Partial<TestProject> {
    suites: Suite[]
}