import { Component, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { HistoryRequest } from 'src/app/models/ReqHistory.model';
import { FileSystem } from 'src/app/services/fileSystem.service';
import { ReqHistoryService } from 'src/app/services/reqHistory.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { ReqHistoryState } from 'src/app/state/history.state';
import apic from 'src/app/utils/apic';
import { TesterTab, TesterTabsService } from '../../tester-tabs/tester-tabs.service';

@Component({
  selector: 'app-tester-left-nav-history',
  templateUrl: './tester-left-nav-history.component.html',
  styleUrls: ['./tester-left-nav-history.component.scss']
})
export class TesterLeftNavHistoryComponent implements OnInit {
  @Select(ReqHistoryState.getFormatted) groupedHistory$: Observable<{ [key: string]: HistoryRequest[] }>;

  flags = {
    showSearch: false,
    searchModel: ''
  }

  constructor(private reqHistoryService: ReqHistoryService,
    private utils: Utils,
    private testerTabService: TesterTabsService,
    private fileSystem: FileSystem,
    private toaster: Toaster) {

  }

  ngOnInit(): void {
  }

  async importHistory() {
    const file: any = await this.fileSystem.readFile();
    var data = null;
    try {
      data = JSON.parse(file.data);

      if (data.TYPE === 'History') {
        if (this.reqHistoryService.validateImportData(data) === true) {
          var history: HistoryRequest[] = [];
          Object.keys(data.value).forEach(function (date) {
            var ts = Date.now();
            history = history.concat(data.value[date].map(function (h) {
              h._id = ts + '-' + Math.random().toString(16).substring(2);
              return h;
            }));
          })
          let status = await this.reqHistoryService.add(history);
          if (status) {
            this.toaster.success('Import Complete.');
          } else {
            this.toaster.error('Import failed.');
          }
        } else {
          this.toaster.error('Selected file doesn\'t contain valid request history.');
        }
      } else {
        this.toaster.error('Selected file doesn\'t contain valid request history.');
      }
    } catch (e) {
      this.toaster.error('Import failed. Invalid file format');
    }
  }

  exportHistory() {
    this.groupedHistory$.pipe(take(1))
      .subscribe(datedHistory => {
        var data = {
          TYPE: 'History',
          value: datedHistory
        };
        this.fileSystem.download('RequestHistory.apic.json', JSON.stringify(data, null, '\t'));
      })
  }

  showSearch() {
    this.flags.showSearch = true;
    document.getElementById('history-search')?.focus();
  }

  openRequest(req: HistoryRequest) {
    let tab: TesterTab = {
      action: 'add', type: 'req', name: 'History: ' + req.name ?? '', data: req, id: 'new_tab:' + apic.s8()
    };
    this.testerTabService.addTab(tab);
  }

  historyDateSort(a, b): number {
    return new Date(a.key) < new Date(b.key) ? 1 : -1;
  }

  async deleteHistory(id: string) {
    try {
      await this.reqHistoryService.delete([id])
    } catch (e) {
      console.error(e);
    }
  }

  async clearAllHistory() {
    try {
      await this.reqHistoryService.clear();
      this.toaster.success('History cleared');
    } catch (e) {
      console.error(e);
    }
  }

  copyUrl(url) {
    this.utils.copyToClipboard(url);
  }

}
