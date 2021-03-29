import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyValueEditorComponent } from './key-value-editor.component';

describe('KeyValueEditorComponent', () => {
  let component: KeyValueEditorComponent;
  let fixture: ComponentFixture<KeyValueEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KeyValueEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KeyValueEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
