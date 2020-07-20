export interface ApiProject {
    _id: string,
    title: string,
    version?: string,
    _created?: number,
    _modified?: number,
    owner?: string,
    team?: string,
    description?: string,
    contact?: any,
    folders?: any,
    models?: any,
    traits?: any,
    setting?: any,
    endpoints?: any,
    termsOfService?: string,
    license?: {
        name?: string,
        url?: string
    },
}