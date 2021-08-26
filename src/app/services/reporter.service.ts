import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReporterService {

  constructor(private httpClient: HttpClient) { }

  async suitReport(runRes, suiteName: string) {
    let template = await this.httpClient.get('assets/suitReport.html', { responseType: 'text' }).toPromise();

    if (template) {
      var data = template.replace('{{brand}}', suiteName);
      data = data.replace('{{title}}', suiteName + '- apic test report');
      data = data.replace('{{totalReqs}}', runRes.results.length);

      var passed = 0, failed = 0, reqList = '', reqDetail = '';
      var reqDetailTemp = '<div class="detail" id="detail-req{{id}}"><div class="title">{{name}}</div><div class="url"><span class="{{method}}">{{method}}</span> <span>{{url}}</span></div><div><span class="{{statusClass}} tag">{{status}}</span><span class="info tag">Time taken: {{time}}</span></div><table class="table"><tr><th>Test Case</th><th style="width:100px;">Status</th></tr>{{tests}}</table></div>';
      for (var i = 0; i < runRes.results.length; i++) {
        var request = runRes.results[i];
        reqList += '<div class="req" id="req' + i + '" onclick="showDetail(this.id)">' + request.name + '</div>';
        var detail = reqDetailTemp.replace('{{name}}', request.name);
        detail = detail.replace('{{id}}', i.toString());
        detail = detail.replace('{{url}}', request.url);
        detail = detail.replace(/{{method}}/g, request.method);

        if (!request.disabled) {
          passed += request.tests.passed;
          failed += request.tests.failed;

          detail = detail.replace('{{status}}', request.response.status + ' ' + request.response.statusText);
          detail = detail.replace('{{time}}', request.response.timeTaken >= 1000 ? (request.response.timeTaken / 1000) + ' s' : request.response.timeTaken + ' ms');

          var statusClass = '';
          switch (request.response.status.toString().charAt(0)) {
            case '1':
              statusClass = 'info';
              break;
            case '2':
              statusClass = 'success';
              break;
            case '3':
              statusClass = 'warning';
              break;
            case '4':
            case '5':
              statusClass = 'error';
              break;
          }
          detail = detail.replace('{{statusClass}}', statusClass);

          var tests = '';
          for (var j = 0; j < request.tests.cases.length; j++) {
            var status = request.tests.cases[j].success ? 'Passed' : 'Failed';
            tests += '<tr><td>' + request.tests.cases[j].name + (request.tests.cases[j].success ? '' : ('<div class="red">' + request.tests.cases[j].reason + '</div>')) + '</td><td><div class="' + status + '">' + status + '</div></td></tr>';
          }
          detail = detail.replace('{{tests}}', tests);
        } else {
          detail = detail.replace('{{status}}', 'Request disabled');
          detail = detail.replace('{{time}}', 'NA');
          detail = detail.replace('{{statusClass}}', 'disabled');
          detail = detail.replace('{{tests}}', 'This request was disabled during run, hence the tests were not executed.');
        }
        reqDetail += detail;
      }
      data = data.replace('{{reqList}}', reqList);


      data = data.replace('{{tests}}', (passed + failed).toString());
      data = data.replace('{{passed}}', passed.toString());
      data = data.replace('{{failed}}', failed.toString());
      if (passed + failed > 0) {
        data = data.replace('{{percent}}', (passed / (passed + failed) * 100).toFixed(2));
      } else {
        data = data.replace('{{percent}}', '0');
      }

      data = data.replace('{{details}}', reqDetail);

      return data;
    }
    return ''

  }
}
