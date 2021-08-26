import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'gql-schema',
  templateUrl: './gql-schema.component.html',
  styleUrls: ['./gql-schema.component.scss']
})
export class GqlSchemaComponent implements OnInit {
  @Input() types: any;//TODO: Check if required
  @Input() path: any;
  constructor() { }

  ngOnInit(): void {
  }
  select(type, $event) {
    $event.preventDefault()
    if (this.path.indexOf(type) < 0) {
      this.path.push(type);
    } else {
      this.path = this.path.slice(0, this.path.indexOf(type) + 1)
    }
  }
}
