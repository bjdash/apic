import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectExportModalComponent } from './project-export-modal.component';

describe('ProjectExportModalComponent', () => {
  let component: ProjectExportModalComponent;
  let fixture: ComponentFixture<ProjectExportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectExportModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectExportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
