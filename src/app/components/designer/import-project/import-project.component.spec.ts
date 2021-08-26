import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportProjectComponent } from './import-project.component';

describe('ImportProjectComponent', () => {
  let component: ImportProjectComponent;
  let fixture: ComponentFixture<ImportProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportProjectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
