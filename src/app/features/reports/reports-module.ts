import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { REPORTS_ROUTES } from './reports.routes';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(REPORTS_ROUTES)],
})
export class ReportsModule {}
