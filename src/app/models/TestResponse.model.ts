export interface Test {
    name: string, success: boolean, error?: string
}

export interface TestResponse {
    type: 'prescript' | 'postscript'
    inMem: { [key: string]: string } //updated env
    logs: string[],
    tests: Test[]
}
