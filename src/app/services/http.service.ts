import { Toaster } from 'src/app/services/toaster.service';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApicUrls } from '../utils/constants';
import { catchError, map } from 'rxjs/operators';
import { Team, TeamPartial } from '../models/Team.model';

export interface ErrorhandlerOption {
    messagePrefix?: string,
    supressNotification?: boolean,
    throwActualError?: boolean
}

@Injectable()
export class HttpService {
    defaultErrorHandlerOption: ErrorhandlerOption = {
        messagePrefix: '',
        supressNotification: false,
        throwActualError: false
    }
    constructor(private toaster: Toaster, private http: HttpClient) { }

    handleHttpError(error, options?: ErrorhandlerOption) {
        console.error('error', error);
        options = { ...this.defaultErrorHandlerOption, ...options };
        let errorMessage = options.messagePrefix ? `${options.messagePrefix} ` : '';
        if (error.error instanceof ErrorEvent) {
            // client-side error
            errorMessage += error.error.message;
        } else {
            // server-side error
            errorMessage += error?.error?.desc ? error.error.desc : error.message
        }
        if (!options.supressNotification) {
            this.toaster.error(errorMessage)
        }
        if (options.throwActualError) {
            return throwError(error);
        }
        return throwError(errorMessage);
    }
    processResponse(response: any) {
        if (response?.status === 'ok') {
            return response.resp;
        } else {
            throw new Error(response?.desc || 'Unknown error');
        }
    }
    processResponseSuccess(response: any) {
        if (response?.status === 'ok') {
            return true;
        } else {
            throw new Error(response?.desc || 'Unknown error');
        }
    }


    getNotifications(): Observable<any[]> {
        return this.http.get(ApicUrls.notifications)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to get notifications.' });
            }))
    }
    getDashboard(): Observable<any> {
        return this.http.get(ApicUrls.dashboard)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to get dashboard details.' });
            }))
    }
    getTeams(): Observable<Team[]> {
        return this.http.get(ApicUrls.team)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to load teams.' });
            }))
    }
    getTeambyId(teamId: string): Observable<Team> {
        return this.http.get(ApicUrls.team + '/' + teamId)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to get team.' });
            }))
    }
    createTeam(name: string) {
        return this.http.post(ApicUrls.team, { name })
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to create team.' });
            }))
    }
    patchTeam(teamId, partialTeam) {
        return this.http.patch(ApicUrls.team + '/' + teamId, { ...partialTeam, modified: Date.now(), id: teamId })
            .pipe(map(this.processResponseSuccess), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to patch team.' });
            }))
    }
    deleteTeam(teamId): Observable<boolean> {
        return this.http.delete(ApicUrls.team + '/' + teamId)
            .pipe(map(this.processResponseSuccess), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to delete team.' });
            }))
    }
    addMember(teamId, newMember: { email: string, role: string }): Observable<Team> {
        return this.http.post(ApicUrls.teamMember.replace('{%teamId%}', teamId), newMember)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: '' });
            }))
    }
    removeMember(teamId, memberUid) {
        return this.http.delete(ApicUrls.teamMember.replace('{%teamId%}', teamId) + memberUid)
            .pipe(map(this.processResponseSuccess), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to remove team member.' });
            }))
    }
    getMembersOf(uid): Observable<TeamPartial[]> {
        return this.http.get(ApicUrls.teamMemberOf + uid)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to load team membership detail.' });
            }))
    }
    exitTeam(teamId): Observable<boolean> {
        return this.http.delete(ApicUrls.teamExit.replace('{%teamId%}', teamId))
            .pipe(map(this.processResponseSuccess), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to leave team.' });
            }))
    }
    inviteToApic(email) {
        return this.http.post(ApicUrls.teamInvite, { data: [email] })
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to invite user.' });
            }))
    }
}