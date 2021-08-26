export interface Test {
    name: string, success: boolean, reason?: string
}

export interface TestResponse {
    type: 'prescript' | 'postscript'
    inMem: { [key: string]: string } //updated env
    logs: string[],
    tests: Test[],
    scriptError: string
}
