export interface Team extends TeamPartial {
    created: string,
    members: TeamMember[],
    modified: string,
}
export interface TeamPartial {
    id: string
    name: string,
    owner: string
}

export interface TeamMember {
    uid: string,
    email: string,
    role: string
}