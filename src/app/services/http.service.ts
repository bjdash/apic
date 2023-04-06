import { Toaster } from 'src/app/services/toaster.service';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApicUrls } from '../utils/constants';
import { catchError, map } from 'rxjs/operators';
import { Team, TeamPartial } from '../models/Team.model';
import { PublishedDocs, PublishedDocsPartial } from '../models/PublishedDoc.model';
import apic from '../utils/apic';
import { ShareType } from './sharing.service';
import { ApiProject } from '../models/ApiProject.model';
import { environment } from 'src/environments/environment';
import LocalStore from './localStore';
import { OpenAPIV3_1 } from 'openapi-types';

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
    } else {
      console.error(errorMessage)
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

  addDummyUser() {
    const userId = LocalStore.get(LocalStore.USER_ID);
    let platform = environment.PLATFORM;
    if (window.apicElectron?.osType) {
      platform += '-' + window.apicElectron?.osType
    }
    var body = {
      id: userId ?? apic.uuid(),
      platform: environment.PLATFORM,
      os: navigator.platform,
      existing: !!userId,
      version: environment.VERSION
    }
    return this.http.post(ApicUrls.registerDummy, body)
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to add dummy user.', supressNotification: true });
      }))
  }
  getNotifications(): Observable<any[]> {
    return this.http.get(ApicUrls.notifications)
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to get notifications.', supressNotification: true });
      }))
  }
  checkForUpdate() {
    return this.http.get(ApicUrls.checkUpdate, {
      params: {
        noCache: `${Math.random()}`,
        oldVersion: environment.VERSION,
        platform: window.apicElectron?.osType || environment.PLATFORM
      }
    })
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to check for updates.' });
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

  getPublishedDocs(): Observable<PublishedDocs[]> {
    return this.http.get(ApicUrls.publishDoc)
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to docs.' });
      }))
  }
  getPublishedDocsById(docId: string): Observable<PublishedDocs> {
    return this.http.get(ApicUrls.publishDoc + '/' + docId)
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to get doc.' });
      }))
  }
  createPublishedDoc(doc: PublishedDocsPartial): Observable<PublishedDocs> {
    let ts = Date.now();
    return this.http.post(ApicUrls.publishDoc, { ...doc, _modified: ts, id: ts + '-' + apic.s12(), ts })
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to create doc.' });
      }))
  }
  updatePublishedDoc(docId, partialDoc: PublishedDocsPartial) {
    return this.http.put(ApicUrls.publishDoc + '/' + docId, { ...partialDoc, _modified: Date.now(), id: docId })
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to update doc.' });
      }))
  }
  deletePublishedDoc(docId): Observable<boolean> {
    return this.http.delete(ApicUrls.publishDoc + '/' + docId)
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to delete.' });
      }))
  }

  updateAccount(name): Observable<boolean> {
    return this.http.put(ApicUrls.accUpdate, { name })
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to update account.' });
      }))
  }
  changePassword(curPsd, newPsd, newPsdAgain) {
    return this.http.post(ApicUrls.changePsd, { curPsd, newPsd, newPsdAgain })
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to change password.' });
      }))
  }
  deleteAccount() {
    return this.http.delete(ApicUrls.account)
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: 'Failed to change password.' });
      }))
  }

  share(objId: string, teamId: string, type: ShareType) {
    return this.http.post(ApicUrls.share, { objId, teamId, type })
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: `Failed to share ${type}.` });
      }))
  }

  shareMulti(objIds: string[], teamId: string, type: ShareType) {
    return this.http.post(ApicUrls.share, { objIds, teamId, type })
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: `Failed to share ${type}.` });
      }))
  }

  unshare(objId: string, teamId: string, type: ShareType) {
    return this.http.post(ApicUrls.unshare, { objId, teamId, type })
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: `Failed to unshare ${type}.` });
      }))
  }

  unshareMulti(objIds: string[], teamId: string, type: ShareType) {
    return this.http.post(ApicUrls.unshare, { objIds, teamId, type })
      .pipe(map(this.processResponseSuccess), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: `Failed to unshare ${type}.` });
      }))
  }

  enableMock(projId: string): Observable<ApiProject> {
    return this.http.get(ApicUrls.enableMock + projId)
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: `Couldn\'t start mocked response for the project. Please try again later.` });
      }))
  }
  disableMock(projId: string): Observable<ApiProject> {
    return this.http.get(ApicUrls.disableMock + projId)
      .pipe(map(this.processResponse), catchError((error) => {
        return this.handleHttpError(error, { messagePrefix: `Couldn\'t disable mocked response for the project. Please try again later.` });
      }))
  }

  downloadCode(type: 'SERVER' | 'CLIENT', lang: string, spec: OpenAPIV3_1.Document) {
    return fetch('https://generator3.swagger.io/api/generate', {
      headers: {
        accept: 'application/octet-stream, application/json',
        'content-type': 'application/json',
        // referrer: 'https://editor.swagger.io/'
      },
      body: JSON.stringify({ lang, spec, type }),
      method: 'POST',
      mode: 'cors',
      credentials: 'omit'
    })

  }
}