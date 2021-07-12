export interface SyncModifiedNotification {
    type: 'update' | 'delete'
    ids: string[],
    forceUpdate?: boolean
}