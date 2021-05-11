import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabSocketComponent } from './tab-socket.component';

describe('TabSocketComponent', () => {
  let component: TabSocketComponent;
  let fixture: ComponentFixture<TabSocketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TabSocketComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabSocketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
