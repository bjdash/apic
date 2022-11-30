import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { from, Observable, Subject } from 'rxjs';
import { delayWhen, takeUntil } from 'rxjs/operators';
import { ApicAceComponent } from 'src/app/components/common/apic-ace/apic-ace.component';
import { TestBuilderSave } from 'src/app/components/common/json-test-builder/json-test-builder.component';
import { Segment } from 'src/app/components/common/json-viewer/json-viewer.component';
import { CompiledApiRequest } from 'src/app/models/CompiledRequest.model';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { ReqAuthMsg } from 'src/app/models/ReqAuthMsg.model';
import { HistoryRequest } from 'src/app/models/ReqHistory.model';
import { ApiRequest, SavedResp } from 'src/app/models/Request.model';
import { RunResponse } from 'src/app/models/RunResponse.model';
import { RunResult } from 'src/app/models/RunResult.model';
import { TestBuilderOption } from 'src/app/models/TestBuilderOption.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { InterpolationService } from 'src/app/services/interpolation.service';
import LocalStore from 'src/app/services/localStore';
import { ReqHistoryService } from 'src/app/services/reqHistory.service';
import { RequestRunnerService } from 'src/app/services/request-runner.service';
import { RequestsService } from 'src/app/services/requests.service';
import { SharingService } from 'src/app/services/sharing.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import apic from 'src/app/utils/apic';
import { Beautifier } from 'src/app/utils/Beautifier';
import { HTTP_HEADERS, HTTP_METHODS, METHOD_WITH_BODY, RAW_BODY_TYPES, REQ_BODY_SNIPS } from 'src/app/utils/constants';
import { RequestUtils } from 'src/app/utils/request.util';
import { SaveReqDialogComponent } from '../../save-req-dialog/save-req-dialog.component';
import { TesterTabInterface } from '../tester-tabs.interface';
import { TesterTabsService } from '../tester-tabs.service';

@Component({
    selector: 'app-tab-request',
    templateUrl: './tab-request.component.html',
    styleUrls: ['./tab-request.component.scss'],
    providers: [RequestRunnerService] //to make sure each tab gets one instance of runner service
})
export class TabRequestComponent implements OnInit, OnDestroy, OnChanges, TesterTabInterface {
    @Input() requestId: string;
    @Input() initialData: ApiRequest;
    @Input() suiteRequest: boolean;
    @Input() projId: string; //The id of the project if the request is an endpoint

    @Output() onSuitReqSave = new EventEmitter();

    @ViewChild('previewFrame') previewFrame: ElementRef;
    @ViewChild('bodyAce') bodyAce: ApicAceComponent;
    @ViewChild('runLoopTrigger') runLoopTrigger: MatMenuTrigger;

    selectedReq: ApiRequest;
    selectedReq$: Observable<ApiRequest>;

    httpMethods = HTTP_METHODS;
    RAW_BODY_TYPES = RAW_BODY_TYPES;
    HTTP_HEADERS = HTTP_HEADERS;
    REQ_BODY_SNIPS = REQ_BODY_SNIPS;
    form: FormGroup;
    private _destroy: Subject<boolean> = new Subject<boolean>();

    dummy = ''
    runResponse: RunResponse; //$response
    runRequest: CompiledApiRequest;//$request
    loopRunResult: RunResponse[];
    reloadRequest: ApiRequest = null;
    flags = {
        showReq: true,
        showResp: true,
        reqTab: 'auth_basic',
        respTab: 'Body', //Body,Tests,Headers,Logs,
        respBodyTab: 'pretty', //pretty, raw, preview
        respAceMode: 'json',
        urlParamsCount: 0,
        headersCount: 0,
        respHeadersCount: 0,
        runCount: 2,
        runCountCopy: 2,
        running: false,
        loopRunning: false,
        urlCopy: ''
    }
    savedRespIdentifier = 'SAVED_RESPONSE'
    errorIdentifier = '"Error';
    testBuilderOpt: TestBuilderOption = null;
    private updatedInBackground: 'update' | 'delete' = null;

    constructor(private fb: FormBuilder,
        private store: Store,
        private tabsService: TesterTabsService,
        private reqService: RequestsService,
        private dialog: MatDialog,
        public utils: Utils,
        private runner: RequestRunnerService,
        public interpolationService: InterpolationService,
        private historyServ: ReqHistoryService,
        private apiProjService: ApiProjectService,
        private sharingService: SharingService,
        private toastr: Toaster) {
        this.form = fb.group({
            name: [''],
            description: [''],
            method: ['GET'],
            url: [''],
            urlParams: [[]],
            headers: [[]],
            body: fb.group({
                type: ['raw'],
                selectedRaw: [{ name: "JSON", val: "application/json" }],
                xForms: [[]],
                formData: [[]],
                rawData: [''],
                gqlVars: ['']
            }),
            prescript: [''],
            postscript: [''],
            respCodes: [[]]
        });

        this.form.controls.urlParams.valueChanges
            .pipe(takeUntil(this._destroy))
            .subscribe((value: KeyVal[]) => {
                this.flags.urlParamsCount = value.filter(v => v.key).length;
            })
        this.form.controls.headers.valueChanges
            .pipe(takeUntil(this._destroy))
            .subscribe((value: KeyVal[]) => {
                this.flags.headersCount = value.filter(v => v.key).length;
            })
        this.reqService.updatedViaSync$.subscribe((notification) => {
            if (this.selectedReq && notification?.ids.includes(this.selectedReq._id)) {
                this.updatedInBackground = notification.type;
            }
        });
        //load last layout
        this.flags.reqTab = LocalStore.getOrDefault(LocalStore.REQ_TAB, 'ReqParam');
        this.flags.respTab = LocalStore.getOrDefault(LocalStore.RESP_TAB, 'Body');
        this.flags.respBodyTab = LocalStore.getOrDefault(LocalStore.RESP_BODY_TAB, 'pretty');
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.requestId?.previousValue?.includes('new_tab') && !changes.requestId?.currentValue?.includes('new_tab')) {
            this.listenForUpdate()
        }
        if (changes.initialData?.currentValue) {
            this.processSelectedReq(this.initialData)
        }
    }

    ngOnDestroy(): void {
        this._destroy.next();
        this._destroy.complete();
    }

    ngOnInit(): void {
        if (!this.requestId?.includes('new_tab') && !this.suiteRequest && !this.projId) {
            this.listenForUpdate()
        } else {

        }
        if (this.initialData) {
            this.processSelectedReq(this.initialData)
        }
    }

    listenForUpdate() {
        this.selectedReq$ = this.store.select(RequestsStateSelector.getRequestByIdDynamic(this.requestId));
        this.selectedReq$
            // .pipe(delayWhen(() => from(this.pendingAction)))
            .pipe(takeUntil(this._destroy))
            .subscribe(req => {
                if (req && (req._modified > this.selectedReq?._modified || !this.selectedReq)) {
                    //TODO: Implement a field level matching logic
                    //so that if any non form fields are updated such as name, savedResponse etc
                    //then directly just update the request instead of asking the user if they want to reload
                    if (this.updatedInBackground == 'update' && !this.sharingService.isLastShared(this.selectedReq?._parent, 'Folders')) {
                        this.reloadRequest = req;
                        this.updatedInBackground = null;
                    } else {
                        this.processSelectedReq(req)
                        this.updatedInBackground = null;
                    }
                } else if (req == undefined && this.selectedReq) {
                    //tab got deleted
                    this.tabsService.updateTab(this.requestId, 'new_tab:' + apic.s8(), 'Deleted Tab: ' + this.selectedReq.name);
                }
            })
    }

    processSelectedReq(req: ApiRequest) {
        this.selectedReq = req;
        const { url, method, name, description, Req: { headers, url_params }, postscript, prescript, respCodes } = req;
        this.form.patchValue({
            name,
            description,
            method,
            url,
            urlParams: url_params,
            headers,
            prescript,
            postscript,
            respCodes: respCodes || []
        });
        if (req.Body) {
            const { Body: { rawData, selectedRaw, type, gqlVars, formData, xForms } } = req;
            this.form.patchValue({
                body: {
                    type: type,
                    selectedRaw: selectedRaw || { name: "JSON", val: "application/json" },
                    xForms: xForms || [],
                    formData: formData || [],
                    rawData,
                    gqlVars
                }
            })
        }

        this.form.markAsPristine();
        this.runResponse = null
    }

    async initReqSave(saveAs: boolean = false) {
        if (this.projId) {
            //this is an endpoint opened from left menu, so only update its scripts
            let { prescript, postscript } = this.form.value;
            try {
                await this.apiProjService.updateEndpoint(this.requestId, this.projId, { prerun: prescript, postrun: postscript });
                this.toastr.success('Test scripts updated for project endpoint.')
            } catch (e) {
                console.error('Failed to update scripts for project endpoint.', e)
                this.toastr.error(`Failed to update endpoint:${e}`)
            }
        } else {
            let saveData: ApiRequest = this.getReqFromForm();
            if (this.suiteRequest) {
                this.onSuitReqSave.next(saveData);
            } else if (this.requestId.includes('new_tab') || saveAs) {
                this.dialog.open(SaveReqDialogComponent, { data: { req: saveData, action: (saveAs ? 'saveAs' : 'new') }, width: '600px' });
            } else {
                await this.updateRequest(saveData);
            }
        }
    }

    async updateRequest(updatedRequest: ApiRequest) {
        if (this.projId) {
            this.toastr.error('This is an autogenerated request from one of your saved API project\'s endpoint.In this tab you can only save the modifications you make to Scripts / Test.To moidify other details navigate to Designer screen.');
            return;
        }
        updatedRequest = { ...this.selectedReq, ...updatedRequest }
        try {
            this.selectedReq = await this.reqService.updateRequest(updatedRequest);
            this.toastr.success('Request updated');
            this.reloadRequest = null;
        } catch (e) {
            console.error(e)
            this.toastr.error(`Failed to update request: ${e.message}`);
        }
    }

    getReqFromForm(): ApiRequest {
        let request = this.form.value;
        let saveData: ApiRequest = {
            url: request.url,
            method: request.method,
            description: request.description,
            Req: {
                url_params: request.urlParams,
                headers: request.headers
            },
            Body: null,
            _id: this.requestId,
            respCodes: request.respCodes,
            prescript: request.prescript,
            postscript: request.postscript,
            name: request.name,
            _parent: this.selectedReq?._parent
        }
        if (METHOD_WITH_BODY.includes(request.method.toUpperCase())) {
            let body = { type: request.body.type };
            switch (request.body.type) {
                case 'form-data':
                    saveData.Body = { ...body, formData: request.body.formData };
                    //TODO: Handle the input type file eg: formatRequestForSave
                    break;
                case 'x-www-form-urlencoded':
                    saveData.Body = { ...body, xForms: request.body.xForms };
                    break;
                case 'raw':
                    saveData.Body = { ...body, selectedRaw: request.body.selectedRaw, rawData: request.body.rawData };
                    break;
                case 'graphql':
                    saveData.Body = { ...body, selectedRaw: request.body.selectedRaw, rawData: request.body.rawData, gqlVars: request.body.gqlVars };
                    break;
            }
        }

        return saveData;
    }

    selectTab(type: string, name: string) {
        this.flags[type] = name;
        LocalStore.set(type, name);
    }

    initRawBody() {
        //TODO:
        // request.Editor.Req.object.completers = [];
        // changeEditorMode(request.Body.selectedRaw.name, 'Req');
    }
    removeAuthHeader() {
        this.form.patchValue({ headers: this.form.value.headers.filter((h: KeyVal) => h.key.toLocaleLowerCase() !== 'authorization') })
        this.toastr.info('Authorization header removed.');
    }
    prerunUpdated(newVal) {
        if (newVal != this.form.value.prescript) {
            this.form.patchValue({ prescript: newVal });
            this.setDirty();
        }
    }

    postrunUpdated(newVal) {
        if (newVal != this.form.value.postscript) {
            this.form.patchValue({ postscript: newVal });
            this.setDirty();
        }
    }

    copyCompiledUrl() {
        this.utils.copyToClipboard(this.interpolationService.interpolate(this.form.value.url))
    }

    showCompiledUrl() {
        this.flags.urlCopy = this.form.value.url;
        this.form.patchValue({ url: this.interpolationService.interpolate(this.form.value.url) });
        setTimeout(() => {
            this.hideCompiledUrl()
        }, 3000);
    }

    hideCompiledUrl() {
        this.form.patchValue({ url: this.flags.urlCopy });
    }

    setDirty() {
        this.form.markAsDirty();
    }

    reload() {
        this.processSelectedReq(this.reloadRequest)
        this.reloadRequest = null
    }

    async doSingleRun() {
        try {
            this.applyRunStatus(true);
            const req: ApiRequest = this.getReqFromForm();
            let result: RunResult = await this.runner.run(req);
            this.runResponse = { ...result.$response };
            this.runRequest = result.$request;
            this.runResponse.bodyPretty = this.beautifyResponse(this.runResponse?.headers?.['Content-Type'], this.runResponse.body);
            this.flags.respHeadersCount = Utils.objectKeys(this.runResponse.headers).length;
            this.applyRunStatus(false);
            if (this.flags.respBodyTab == 'preview' && this.flags.respTab == 'Body') {
                this.setPreviewFrame(this.runResponse.body);
            }
            if (this.runResponse.status != 0) {
                this.scrollRespIntoView();
            }
            this.addToHistory(req, result.$response);
        } catch (e) {
            this.toastr.error(`Failed to run request: ${e.message}`)
            console.error(e);
            this.applyRunStatus(false);
        }
    }

    addToHistory(request: ApiRequest, response: RunResponse) {
        let history: HistoryRequest = { ...request, savedResp: [RequestUtils.formatResponseForSave(response)] }
        this.historyServ.add([history])
    }

    async startLoopRun() {
        if (this.flags.runCount === undefined) {
            this.toastr.error('Please enter a valid number.');
            return;
        }
        if (this.flags.runCount <= 0) {
            this.toastr.error('Please enter a count greater than zero.');
            return;
        }
        if (this.flags.runCount > 1000) {
            this.toastr.error('Currently apic supports running a maximum of 1000 iterations.');
            return;
        }
        this.flags.runCountCopy = this.flags.runCount;
        this.applyRunStatus(true, true);
        this.runLoopTrigger.closeMenu();

        //scroll to end
        setTimeout(() => {
            let parent = (document.querySelector('.tester-tabs .mat-tab-body-active .mat-tab-body-content') as HTMLElement);
            parent.scrollTop = parent.scrollHeight;
        }, 0);

        const req: ApiRequest = this.getReqFromForm();
        while (this.flags.runCountCopy > 0 && this.flags.loopRunning) {
            try {
                let result: RunResult = await this.runner.run(req);
                this.loopRunResult.push({ ...result.$response });
                this.flags.runCountCopy--;
            } catch (e) {
                this.toastr.error(`Failed to run request. Run count:${this.flags.runCount - this.flags.runCountCopy + 1}. ${e.message}`)
            }
        }
        this.applyRunStatus(false, true);
        this.scrollRespIntoView();
    }

    abortRun() {
        this.applyRunStatus(false);
        this.runner.abort();
        this.flags.loopRunning = false;
        this.flags.runCountCopy = 0;
    }
    beautifyResponse(contentType: string, body: string): string {
        //formatting response for pretty print
        if (contentType?.includes('json')) {
            this.flags.respAceMode = 'json';
            return Beautifier.json(body)
        } else if (contentType?.includes('xml') || contentType?.includes('html')) {
            this.flags.respAceMode = 'xml';
            return Beautifier.xml(body);
        } else if (contentType?.includes('javascript')) {
            this.flags.respAceMode = 'javascript';
            return Beautifier.javascript(body)
        } else {
            //attepmt to use json, fallback to text
            try {
                this.flags.respAceMode = 'json';
                return Beautifier.json(body)
            } catch (e) {
                this.flags.respAceMode = 'text';
                return body
            }
        }
    }

    applyRunStatus(running: boolean, loopRunning = false) {
        this.flags.running = running;
        if (running) {
            this.form.disable();
            this.loopRunResult = [];
            this.runResponse = null
        } else {
            this.form.enable();
        }
        this.flags.loopRunning = loopRunning ? running : false;
    }

    async saveResponse() {
        if (this.requestId.includes('new_tab')) {
            this.toastr.error('Please save the request first.');
            return;
        }
        let savedResp: SavedResp = RequestUtils.formatResponseForSave(this.runResponse);
        if (this.suiteRequest) {
            this.onSuitReqSave.emit({ savedResp: [savedResp] })
        } else {
            let updatedReq: ApiRequest = { ...this.selectedReq, savedResp: [savedResp] };
            await this.updateRequest(updatedReq);
        }
    }

    loadResponse(scroll?: boolean) {
        let savedResp: SavedResp = this.selectedReq.savedResp[0];
        this.runResponse = {
            headers: savedResp.headers,
            status: parseInt(`${savedResp.status}`), //old apic status was saved as string
            statusText: savedResp.statusText,
            body: savedResp.data,
            bodyPretty: this.beautifyResponse(savedResp?.headers?.['Content-Type'], savedResp.data),
            data: null,
            timeTaken: parseInt(`${savedResp.time}`),
            timeTakenStr: Utils.formatTime(parseInt(`${savedResp.time}`)),
            respSize: savedResp.size,
            logs: ['Loaded from saved response'],
            tests: [],
            meta: this.savedRespIdentifier,
            scriptError: null
        };
        try {
            this.runResponse.data = JSON.parse(this.runResponse.body);
        } catch (e) {
            console.info('The response cant be converted to JSON');
        }

        if (scroll) this.scrollRespIntoView()
    }

    beautifyLog(index: number) {
        this.runResponse.logs[index] = Beautifier.json(this.runResponse.logs[index], '  ')
    }

    onTestBuilder({ segment, top }: { segment: Segment, top: number }) {
        let scrlTop = document.querySelector('.test-tabs>.mat-tab-body-wrapper>.mat-tab-body.mat-tab-body-active>.mat-tab-body-content').scrollTop;
        this.testBuilderOpt = {
            parent: segment.parent,
            key: segment.key,
            val: segment.value,
            showRun: true,
            show: true,
            top: top + scrlTop - 400
        }
    }

    saveBuilderTests({ tests, autoSave }: TestBuilderSave) {
        this.form.patchValue({ postscript: this.form.value.postscript + '\n' + tests });
        if (autoSave) {
            this.initReqSave();
        } else {
            this.toastr.info('Test added to postrun scripts.')
        }
    }
    passedTests() {
        return this.runResponse.tests.filter(test => test.success)
    }
    failedTests() {
        return this.runResponse.tests.filter(test => !test.success)
    }

    setPreviewFrame(data) {
        setTimeout(() => {
            this.previewFrame.nativeElement.src = 'data:text/html;charset=utf-8,' + escape(data)
        }, 0);
    }

    prettifyBody() {
        this.form.controls.body.patchValue({ rawData: Beautifier.json(this.form.value.body.rawData) })
    }

    addReqBodySnip(code) {
        let editor = this.bodyAce.getEditor();
        var cursor = editor.selection.getCursor();
        editor.session.insert(cursor, code);
        this.form.controls.body.patchValue({ rawData: editor.getValue() });
        this.bodyAce.focus();
    }

    scrollRespIntoView() {
        //Scroll response panel to view
        setTimeout(() => {
            var topOffset = (document.querySelector('.tester-tabs .mat-tab-body-active .resp-box') as HTMLElement).offsetTop;
            if (topOffset - 150 > 0) {
                let parent = (document.querySelector('.tester-tabs .mat-tab-body-active .mat-tab-body-content') as HTMLElement);
                parent.scrollTo({ top: topOffset + parent.scrollTop - 50, behavior: 'smooth' });
            }
        }, 0);

    }

    onGqlVarsChange(value) {
        this.form.controls['body'].patchValue({ gqlVars: value })
    }

    trackByFn(index, item) {
        return index;
    }

    updateAuthValue(auth: ReqAuthMsg) {
        if (auth.addTo === 'header') {
            this.updateKeyValForm(auth.value, this.form.value.headers, this.form, 'headers')
            this.toastr.info('Auth params added to header.');
        } else if (auth.addTo === 'body') {
            if (METHOD_WITH_BODY.indexOf(this.form.value.method) >= 0 && this.form.value.body.type === 'form-data') {
                this.updateKeyValForm(auth.value, this.form.value.body.formData, this.form.controls['body'], 'formData')
                this.toastr.info('Auth params added to body(as form-data).');
            } else if (METHOD_WITH_BODY.indexOf(this.form.value.method) >= 0 && this.form.value.body.type === 'x-www-form-urlencoded') {
                this.updateKeyValForm(auth.value, this.form.value.body.xForms, this.form.controls['body'], 'xForms')
                this.toastr.info('Auth params added to body(as x-www-form).');
            } else {
                this.updateKeyValForm(auth.value, this.form.value.urlParams, this.form, 'urlParams')
                this.toastr.info('Auth string added to url parameters');
            }
        } else if (auth.addTo === 'query') {
            this.updateKeyValForm(auth.value, this.form.value.urlParams, this.form, 'urlParams')
            this.toastr.info('Auth string added to url parameters');
        }
    }

    private updateKeyValForm(valsToAdd: KeyVal[], existing: KeyVal[], patchTo: AbstractControl, patchKey: string) {
        let keysToAdd = valsToAdd.map(kv => kv.key.toLowerCase());
        let existingKeys: KeyVal[] = existing.filter((h: KeyVal) => !keysToAdd.includes(h.key.toLocaleLowerCase()));
        if (existingKeys.length > 0 && !existingKeys[existingKeys.length - 1].key && !existingKeys[existingKeys.length - 1].val) {
            existingKeys.pop()
        }
        patchTo.patchValue({ [patchKey]: [...existingKeys, ...valsToAdd] });
    }
}
